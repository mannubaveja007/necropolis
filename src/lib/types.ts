export type PackageStatus = "alive" | "restless" | "haunted" | "dead" | "unknown";

export interface ScannedPackage {
  /** Package name as written in package.json, e.g. "@scope/pkg". */
  name: string;
  /** Version range declared in package.json, or the resolved latest when unparseable. */
  version: string;
  /** Latest version published to the npm registry, null when unknown. */
  latest: string | null;
  /** ISO timestamp of the latest publish, taken from registry time[latest]. */
  lastPublish: string | null;
  /** Whole years since the latest publish, one decimal. Null when unknown. */
  yearsSince: number | null;
  /** Deprecation message from the registry, when present. */
  deprecatedMessage: string | null;
  status: PackageStatus;
}

export interface ScanSummary {
  total: number;
  alive: number;
  restless: number;
  haunted: number;
  dead: number;
  unknown: number;
  /** 0–100: how haunted the graveyard is. Higher means more decay. */
  hauntingScore: number;
}

export interface ScanResponse {
  packages: ScannedPackage[];
  summary: ScanSummary;
}

/** Exactly the facts the epitaph model is allowed to see. */
export interface EpitaphRequest {
  name: string;
  version: string;
  lastPublish: string | null;
  yearsSince: number | null;
  deprecatedMessage: string | null;
}

export interface Epitaph {
  name: string;
  version: string;
  epitaph: string;
  warning: string;
  source: "ollama" | "template";
}

export interface HealthResponse {
  ollama: boolean;
  model: string;
  url: string;
  latencyMs: number | null;
}
