import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FETCH_TIMEOUT_MS,
  MAX_PACKAGES,
  REGISTRY_URL,
  hauntingScore,
  parseDependencies,
  resolvePackage,
  statusOf,
  summarize,
} from "@/lib/npm";
import type { PackageStatus, ScannedPackage } from "@/lib/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function scanned(status: PackageStatus): ScannedPackage {
  return {
    name: `pkg-${status}`,
    version: "^1.0.0",
    latest: "1.0.0",
    lastPublish: null,
    yearsSince: null,
    deprecatedMessage: null,
    status,
  };
}

function registryBody(
  latest: string,
  lastPublish: string,
  deprecated?: string,
): Record<string, unknown> {
  return {
    "dist-tags": { latest },
    time: { [latest]: lastPublish },
    versions: { [latest]: deprecated ? { deprecated } : {} },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parseDependencies", () => {
  it("merges dependencies and devDependencies with dev taking priority", () => {
    const raw = JSON.stringify({
      dependencies: { react: "^19.0.0", "left-pad": "^1.3.0" },
      devDependencies: { react: "^18.0.0", vitest: "^5.0.0" },
    });

    expect(parseDependencies(raw)).toEqual([
      { name: "react", version: "^18.0.0" },
      { name: "left-pad", version: "^1.3.0" },
      { name: "vitest", version: "^5.0.0" },
    ]);
  });

  it("ignores non-string version values", () => {
    const raw = JSON.stringify({
      dependencies: { valid: "^1.0.0", number: 1, nul: null, object: {} },
      devDependencies: { alsoValid: "^2.0.0" },
    });

    expect(parseDependencies(raw)).toEqual([
      { name: "valid", version: "^1.0.0" },
      { name: "alsoValid", version: "^2.0.0" },
    ]);
  });

  it(`dedupes and caps the list at ${MAX_PACKAGES} packages`, () => {
    const dependencies: Record<string, string> = {};
    for (let i = 0; i < 60; i += 1) {
      dependencies[`pkg-${i}`] = "^1.0.0";
    }

    const parsed = parseDependencies(JSON.stringify({ dependencies }));

    expect(parsed).toHaveLength(MAX_PACKAGES);
    expect(parsed[0]).toEqual({ name: "pkg-0", version: "^1.0.0" });
    expect(parsed[MAX_PACKAGES - 1]).toEqual({
      name: `pkg-${MAX_PACKAGES - 1}`,
      version: "^1.0.0",
    });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseDependencies("{ nope")).toThrow("That is not valid JSON.");
    expect(() => parseDependencies("[]")).toThrow("That is not valid JSON.");
    expect(() => parseDependencies("null")).toThrow("That is not valid JSON.");
  });

  it("rejects package.json files without dependencies", () => {
    expect(() => parseDependencies("{}")).toThrow(
      "No dependencies or devDependencies found.",
    );
    expect(() => parseDependencies('{"dependencies":{}}')).toThrow(
      "No dependencies or devDependencies found.",
    );
    expect(
      () =>
        parseDependencies(
          '{"devDependencies":{"ignored":1},"peerDependencies":{"x":"1"}}',
        ),
    ).toThrow("No dependencies or devDependencies found.");
  });
});

describe("statusOf", () => {
  it("maps ages to the expected tombstone thresholds", () => {
    expect(statusOf(null, 0.4)).toBe("alive");
    expect(statusOf(null, 1.0)).toBe("restless");
    expect(statusOf(null, 2.0)).toBe("restless");
    expect(statusOf(null, 2.1)).toBe("dead");
  });

  it("treats a deprecation message as haunted regardless of age", () => {
    expect(statusOf("Use fetch instead.", 0.1)).toBe("haunted");
    expect(statusOf("Use fetch instead.", 7.4)).toBe("haunted");
  });

  it("returns unknown when the publish date is missing", () => {
    expect(statusOf(null, null)).toBe("unknown");
  });
});

describe("hauntingScore and summarize", () => {
  // dead 1.0 + alive 0.05 + haunted 0.8 + unknown 0.65 + restless 0.45
  const fixture = [
    scanned("dead"),
    scanned("alive"),
    scanned("haunted"),
    scanned("unknown"),
    scanned("restless"),
  ];

  it("computes the weight average by hand: 295 / 5 = 59", () => {
    expect(hauntingScore(fixture)).toBe(59);
  });

  it("returns 0 for an empty Kabristan", () => {
    expect(hauntingScore([])).toBe(0);
    expect(summarize([])).toEqual({
      total: 0,
      alive: 0,
      restless: 0,
      haunted: 0,
      dead: 0,
      unknown: 0,
      hauntingScore: 0,
    });
  });

  it("counts each status and totals the packages", () => {
    expect(summarize(fixture)).toEqual({
      total: 5,
      alive: 1,
      restless: 1,
      haunted: 1,
      dead: 1,
      unknown: 1,
      hauntingScore: 59,
    });
  });
});

describe("resolvePackage", () => {
  it("reads dist-tags, time and deprecation data from the registry", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2023-06-01T00:00:00.000Z"),
    );

    const body = registryBody("2.0.0", "2020-06-01T00:00:00.000Z");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse(body),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolvePackage("left-pad", "^1.3.0");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${REGISTRY_URL}/left-pad`);
    expect(init).toMatchObject({
      headers: { accept: "application/json" },
      signal: expect.any(AbortSignal),
    });
    expect(FETCH_TIMEOUT_MS).toBe(5000);

    expect(result).toEqual({
      name: "left-pad",
      version: "^1.3.0",
      latest: "2.0.0",
      lastPublish: "2020-06-01T00:00:00.000Z",
      yearsSince: 3,
      deprecatedMessage: null,
      status: "dead",
    });
  });

  it("marks deprecated packages haunted even when they are old", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2023-06-01T00:00:00.000Z"),
    );

    const body = registryBody(
      "2.88.2",
      "2020-06-01T00:00:00.000Z",
      "request has been deprecated",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(body)),
    );

    const result = await resolvePackage("request", "^2.88.2");

    expect(result.deprecatedMessage).toBe("request has been deprecated");
    expect(result.status).toBe("haunted");
  });

  it("returns an unknown tombstone for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    const result = await resolvePackage("ghost-package", "^0.0.1");

    expect(result).toEqual({
      name: "ghost-package",
      version: "^0.0.1",
      latest: null,
      lastPublish: null,
      yearsSince: null,
      deprecatedMessage: null,
      status: "unknown",
    });
  });

  it("returns an unknown tombstone when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    const result = await resolvePackage("offline-package", "^1.0.0");

    expect(result.status).toBe("unknown");
    expect(result.latest).toBeNull();
  });

  it("returns an unknown tombstone for a malformed registry body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json", { status: 200 })),
    );

    const result = await resolvePackage("weird-package", "latest");

    expect(result.status).toBe("unknown");
  });

  it("encodes scoped package names in the registry URL", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await resolvePackage("@scope/pkg", "^1.0.0");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${REGISTRY_URL}/%40scope%2Fpkg`,
    );
  });
});
