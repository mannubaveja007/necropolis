import type { Epitaph, EpitaphRequest } from "@/lib/types";

export const FALLBACK_SOURCE = "template";

export const SYSTEM_PROMPT =
  "You are a gravedigger poet. Using ONLY the facts given, write a 2-sentence epitaph and a 1-sentence maintenance warning. Never invent dates, versions, CVEs or package names. Name a replacement only if the deprecation message names one; otherwise write 'successor unknown'. Return JSON {epitaph, warning}.";

// A local generation can take ~45s, so allow a full minute before falling
// back; the registry fetch keeps its much shorter 5s budget.
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 180_000;
const MAX_FIELD_CHARS = 600;

const DEFAULT_OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_OLLAMA_MODEL = "gemma3:4b";

/** Successful Ollama answers only; templates are deliberately never cached. */
const cache = new Map<string, Epitaph>();

export function __clearEpitaphCache(): void {
  cache.clear();
}

export function ollamaEndpoint(): string {
  return process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
}

export function ollamaModel(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
}

function cacheKey(facts: EpitaphRequest): string {
  return `${facts.name}@${facts.version}`;
}

function formatYears(years: number): string {
  return Number.isInteger(years) ? years.toFixed(1) : String(years);
}

/**
 * The deterministic epitaph used whenever the model is unavailable or
 * returns something we cannot trust. It only repeats the facts it was given.
 */
export function templateEpitaph(facts: EpitaphRequest): Epitaph {
  const publishDate = facts.lastPublish
    ? facts.lastPublish.slice(0, 10)
    : "an unrecorded date";
  const age =
    facts.yearsSince === null
      ? " The years since its last release are unrecorded."
      : ` It has rested ${formatYears(facts.yearsSince)} years since its last release.`;

  const epitaph = `Here lies ${facts.name} ${facts.version}, last published on ${publishDate}.${age}`;

  const warning = facts.deprecatedMessage
    ? `The maintainers marked this package deprecated: ${facts.deprecatedMessage}`
    : "No deprecation notice was ever recorded; successor unknown.";

  return {
    name: facts.name,
    version: facts.version,
    epitaph: epitaph.slice(0, MAX_FIELD_CHARS),
    warning: warning.slice(0, MAX_FIELD_CHARS),
    source: FALLBACK_SOURCE,
  };
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Ask Ollama for an epitaph. Never throws: any transport error, timeout,
 * non-ok response, or malformed answer falls back to the template.
 */
export async function requestEpitaph(
  facts: EpitaphRequest,
): Promise<Epitaph> {
  const fallback = templateEpitaph(facts);

  try {
    const response = await fetch(ollamaEndpoint(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      body: JSON.stringify({
        model: ollamaModel(),
        system: SYSTEM_PROMPT,
        prompt: `Facts: ${JSON.stringify({
          ...facts,
          lastPublish: facts.lastPublish ? facts.lastPublish.slice(0, 10) : null,
        })}\nReturn JSON only.`,
        stream: false,
        format: "json",
        options: { temperature: 0.7 },
        keep_alive: "30m",
      }),
    });

    if (!response.ok) return fallback;

    const data: unknown = await response.json();
    const raw = isRecord(data) ? data.response : undefined;
    if (typeof raw !== "string") return fallback;

    const parsed: unknown = JSON.parse(stripCodeFences(raw));
    if (!isRecord(parsed)) return fallback;

    const epitaph =
      typeof parsed.epitaph === "string"
        ? parsed.epitaph.trim().slice(0, MAX_FIELD_CHARS)
        : "";
    const warning =
      typeof parsed.warning === "string"
        ? parsed.warning.trim().slice(0, MAX_FIELD_CHARS)
        : "";

    if (!epitaph || !warning) return fallback;

    return {
      name: facts.name,
      version: facts.version,
      epitaph,
      warning,
      source: "ollama",
    };
  } catch {
    return fallback;
  }
}

/**
 * Cache-through lookup for a package's epitaph. Only model-written answers
 * are cached so a retry can recover once Ollama comes back.
 */
export async function epitaphFor(facts: EpitaphRequest): Promise<Epitaph> {
  const key = cacheKey(facts);
  const cached = cache.get(key);
  if (cached) return cached;

  const result = await requestEpitaph(facts);
  if (result.source === "ollama") {
    cache.set(key, result);
  }

  return result;
}
