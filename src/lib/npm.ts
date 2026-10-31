import type { PackageStatus, ScanSummary, ScannedPackage } from "@/lib/types";

export interface DependencyEntry {
  name: string;
  version: string;
}

export const MAX_PACKAGES = 40;
export const REGISTRY_URL = "https://registry.npmjs.org";
export const FETCH_TIMEOUT_MS = 5000;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Weights used to turn package statuses into a 0–100 haunting score. */
const STATUS_WEIGHT: Record<PackageStatus, number> = {
  dead: 1,
  haunted: 0.8,
  unknown: 0.65,
  restless: 0.45,
  alive: 0.05,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Turn a raw package.json string into the dependency list we can scan.
 * devDependencies win when a name appears in both blocks; non-string
 * versions are ignored; the result is deduped and capped at MAX_PACKAGES.
 */
export function parseDependencies(raw: string): DependencyEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That is not valid JSON.");
  }

  if (!isPlainObject(parsed)) {
    throw new Error("That is not valid JSON.");
  }

  const entries = new Map<string, string>();

  for (const field of ["dependencies", "devDependencies"] as const) {
    const group = parsed[field];
    if (!isPlainObject(group)) continue;

    for (const [name, version] of Object.entries(group)) {
      if (typeof version !== "string") continue;
      entries.set(name, version);
    }
  }

  if (entries.size === 0) {
    throw new Error("No dependencies or devDependencies found.");
  }

  return Array.from(entries, ([name, version]) => ({ name, version })).slice(
    0,
    MAX_PACKAGES,
  );
}

/**
 * Map a dependency's deprecation notice and age onto a tombstone status.
 * Age is measured from the latest publish; unknown dates stay unknown.
 */
export function statusOf(
  deprecatedMessage: string | null,
  yearsSince: number | null,
): PackageStatus {
  if (yearsSince === null) return "unknown";
  if (deprecatedMessage) return "haunted";
  if (yearsSince > 2) return "dead";
  if (yearsSince >= 1) return "restless";
  return "alive";
}

/** 0–100: the share of the graveyard that has decayed. Empty is 0. */
export function hauntingScore(packages: ScannedPackage[]): number {
  if (packages.length === 0) return 0;

  const weighted = packages.reduce(
    (total, pkg) => total + STATUS_WEIGHT[pkg.status],
    0,
  );

  return Math.round((100 * weighted) / packages.length);
}

export function summarize(packages: ScannedPackage[]): ScanSummary {
  const summary: ScanSummary = {
    total: packages.length,
    alive: 0,
    restless: 0,
    haunted: 0,
    dead: 0,
    unknown: 0,
    hauntingScore: hauntingScore(packages),
  };

  for (const pkg of packages) {
    summary[pkg.status] += 1;
  }

  return summary;
}

function unknownPackage(name: string, version: string): ScannedPackage {
  return {
    name,
    version,
    latest: null,
    lastPublish: null,
    yearsSince: null,
    deprecatedMessage: null,
    status: "unknown",
  };
}

/**
 * Look a dependency up in the npm registry. Every failure — 404, network
 * error, timeout, unparseable body — degrades to an "unknown" tombstone
 * instead of rejecting, so one bad package can never sink a scan.
 */
export async function resolvePackage(
  name: string,
  versionRange: string,
): Promise<ScannedPackage> {
  const fallback = unknownPackage(name, versionRange);

  try {
    const response = await fetch(
      `${REGISTRY_URL}/${encodeURIComponent(name)}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (!response.ok) return fallback;

    const body: unknown = await response.json();
    if (!isPlainObject(body)) return fallback;

    const distTags = body["dist-tags"];
    const latest =
      isPlainObject(distTags) && typeof distTags.latest === "string"
        ? distTags.latest
        : null;
    if (!latest) return fallback;

    const times = body.time;
    const rawLastPublish = isPlainObject(times) ? times[latest] : undefined;
    const lastPublish =
      typeof rawLastPublish === "string" &&
      !Number.isNaN(Date.parse(rawLastPublish))
        ? rawLastPublish
        : null;

    const versions = body.versions;
    const latestManifest = isPlainObject(versions) ? versions[latest] : undefined;
    const rawDeprecated = isPlainObject(latestManifest)
      ? latestManifest.deprecated
      : undefined;
    const deprecatedMessage =
      typeof rawDeprecated === "string" && rawDeprecated.trim() !== ""
        ? rawDeprecated
        : null;

    const yearsSince =
      lastPublish === null
        ? null
        : Math.round(
            ((Date.now() - Date.parse(lastPublish)) / MS_PER_YEAR) * 10,
          ) / 10;

    return {
      name,
      version: versionRange,
      latest,
      lastPublish,
      yearsSince,
      deprecatedMessage,
      status: statusOf(deprecatedMessage, yearsSince),
    };
  } catch {
    return fallback;
  }
}
