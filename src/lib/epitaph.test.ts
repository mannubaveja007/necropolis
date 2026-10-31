import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_SOURCE,
  SYSTEM_PROMPT,
  __clearEpitaphCache,
  epitaphFor,
  ollamaEndpoint,
  ollamaModel,
  requestEpitaph,
  templateEpitaph,
} from "@/lib/epitaph";
import type { EpitaphRequest } from "@/lib/types";

const facts: EpitaphRequest = {
  name: "request",
  version: "^2.88.2",
  lastPublish: "2020-02-11T00:00:00.000Z",
  yearsSince: 5.6,
  deprecatedMessage: "request has been deprecated",
};

function ollamaResponse(answer: unknown): Response {
  return new Response(JSON.stringify({ response: answer }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  __clearEpitaphCache();
  vi.stubEnv("OLLAMA_URL", "");
  vi.stubEnv("OLLAMA_MODEL", "");
});

afterEach(() => {
  __clearEpitaphCache();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("SYSTEM_PROMPT and configuration", () => {
  it("keeps the exact anti-hallucination system prompt", () => {
    expect(SYSTEM_PROMPT).toBe(
      "You are a gravedigger poet. Using ONLY the facts given, write a 2-sentence epitaph and a 1-sentence maintenance warning. Never invent dates, versions, CVEs or package names. Name a replacement only if the deprecation message names one; otherwise write 'successor unknown'. Return JSON {epitaph, warning}.",
    );
  });

  it("defaults the endpoint and model, and honours env overrides", () => {
    expect(ollamaEndpoint()).toBe("http://localhost:11434/api/generate");
    expect(ollamaModel()).toBe("gemma3:4b");

    vi.stubEnv("OLLAMA_URL", "http://gpu-box:1234/api/generate");
    vi.stubEnv("OLLAMA_MODEL", "llama3:8b");

    expect(ollamaEndpoint()).toBe("http://gpu-box:1234/api/generate");
    expect(ollamaModel()).toBe("llama3:8b");
  });
});

describe("requestEpitaph", () => {
  it("posts the facts to Ollama and parses a clean JSON answer", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ollamaResponse(
          JSON.stringify({
            epitaph: "Here lies request, unmourned.",
            warning: "Use fetch.",
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestEpitaph(facts);

    expect(result).toEqual({
      name: "request",
      version: "^2.88.2",
      epitaph: "Here lies request, unmourned.",
      warning: "Use fetch.",
      source: "ollama",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(ollamaEndpoint());
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toMatchObject({ "content-type": "application/json" });

    expect(JSON.parse(String(init?.body))).toEqual({
      model: "gemma3:4b",
      system: SYSTEM_PROMPT,
      prompt: `Facts: ${JSON.stringify({
        ...facts,
        lastPublish: facts.lastPublish ? facts.lastPublish.slice(0, 10) : null,
      })}\nReturn JSON only.`,
      stream: false,
      format: "json",
      think: false,
      options: { temperature: 0.7, num_predict: 220, num_ctx: 1024 },
      keep_alive: "30m",
    });
  });

  it("strips ```json fences before parsing", async () => {
    const answer = `\`\`\`json\n${JSON.stringify({
      epitaph: "Fenced but factual.",
      warning: "Still tell the living.",
    })}\n\`\`\``;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ollamaResponse(answer)),
    );

    const result = await requestEpitaph(facts);

    expect(result.source).toBe("ollama");
    expect(result.epitaph).toBe("Fenced but factual.");
    expect(result.warning).toBe("Still tell the living.");
  });

  it("falls back to the template for malformed model output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ollamaResponse("I am sorry, I cannot do that.")),
    );

    const result = await requestEpitaph(facts);

    expect(result.source).toBe(FALLBACK_SOURCE);
    expect(result).toEqual(templateEpitaph(facts));
  });

  it("falls back to the template when the model omits a field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ollamaResponse(JSON.stringify({ epitaph: "Only half an epitaph." })),
      ),
    );

    expect((await requestEpitaph(facts)).source).toBe("template");
  });

  it("falls back to the template when the request fails or times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect((await requestEpitaph(facts)).source).toBe("template");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    expect((await requestEpitaph(facts)).source).toBe("template");
  });

  it("caps each field at 600 characters", async () => {
    const long = "x".repeat(900);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ollamaResponse(JSON.stringify({ epitaph: long, warning: long })),
      ),
    );

    const result = await requestEpitaph(facts);

    expect(result.epitaph).toHaveLength(600);
    expect(result.warning).toHaveLength(600);
  });
});

describe("templateEpitaph", () => {
  it("is deterministic and repeats only the given facts", () => {
    const result = templateEpitaph(facts);

    expect(result).toEqual(templateEpitaph(facts));
    expect(result.source).toBe(FALLBACK_SOURCE);
    expect(result.name).toBe("request");
    expect(result.version).toBe("^2.88.2");
    expect(result.epitaph).toContain("request");
    expect(result.epitaph).toContain("^2.88.2");
    expect(result.epitaph).toContain("2020-02-11");
    expect(result.epitaph).toContain("5.6");
    expect(result.warning).toContain("request has been deprecated");
  });

  it("uses an unrecorded date and ends with successor unknown when facts are missing", () => {
    const result = templateEpitaph({
      name: "ghost-package",
      version: "1.0.0",
      lastPublish: null,
      yearsSince: null,
      deprecatedMessage: null,
    });

    expect(result.epitaph).toContain("an unrecorded date");
    expect(result.warning.endsWith("successor unknown.")).toBe(true);
  });
});

describe("epitaphFor cache", () => {
  it("caches successful Ollama answers and skips the second fetch", async () => {
    const fetchMock = vi.fn(async () =>
      ollamaResponse(
        JSON.stringify({ epitaph: "Cached epitaph.", warning: "Cached warning." }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await epitaphFor(facts);
    const second = await epitaphFor(facts);

    expect(first.source).toBe("ollama");
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache templates, so a retry can reach Ollama", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("Ollama is down");
      return ollamaResponse(
        JSON.stringify({ epitaph: "Back from the dead.", warning: "Retry worked." }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await epitaphFor(facts);
    expect(first.source).toBe("template");

    const second = await epitaphFor(facts);
    expect(second.source).toBe("ollama");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the cache between Kabristans", async () => {
    const fetchMock = vi.fn(async () =>
      ollamaResponse(JSON.stringify({ epitaph: "One.", warning: "One." })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await epitaphFor(facts);
    __clearEpitaphCache();
    await epitaphFor(facts);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
