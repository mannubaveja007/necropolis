import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/scan/route";
import { MAX_PACKAGES, REGISTRY_URL } from "@/lib/npm";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function post(body: unknown): Request {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postRaw(body: string): Request {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
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

describe("POST /api/scan", () => {
  it("returns 400 for a body that is not JSON", async () => {
    const response = await POST(postRaw("not json at all"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 when packageJson is missing or not a string", async () => {
    for (const body of [{}, { packageJson: 42 }, { packageJson: null }]) {
      const response = await POST(post(body));
      expect(response.status).toBe(400);
      expect(typeof (await response.json()).error).toBe("string");
    }
  });

  it("returns 400 when the package.json is invalid or empty", async () => {
    const invalid = await POST(post({ packageJson: "{ nope" }));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("That is not valid JSON.");

    const empty = await POST(post({ packageJson: "{}" }));
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe(
      "No dependencies or devDependencies found.",
    );
  });

  it("scans every dependency and returns a summary", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2025-01-01T00:00:00.000Z"),
    );

    const registry: Record<string, unknown> = {
      react: registryBody("19.0.0", "2024-01-01T00:00:00.000Z"),
      request: registryBody(
        "2.88.2",
        "2020-01-01T00:00:00.000Z",
        "request has been deprecated",
      ),
      "left-pad": registryBody("1.3.0", "2018-04-01T00:00:00.000Z"),
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const name = decodeURIComponent(url.slice(`${REGISTRY_URL}/`.length));
      const payload = registry[name];
      return payload
        ? new Response(JSON.stringify(payload), { status: 200 })
        : new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const packageJson = JSON.stringify({
      dependencies: {
        react: "^19.0.0",
        request: "^2.88.2",
        "left-pad": "^1.3.0",
      },
    });

    const response = await POST(post({ packageJson }));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.packages).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const scannedRequest = body.packages.find(
      (pkg: { name: string }) => pkg.name === "request",
    );
    expect(scannedRequest).toMatchObject({
      name: "request",
      version: "^2.88.2",
      latest: "2.88.2",
      lastPublish: "2020-01-01T00:00:00.000Z",
      yearsSince: 5,
      deprecatedMessage: "request has been deprecated",
      status: "haunted",
    });

    expect(body.summary).toEqual({
      total: 3,
      alive: 0,
      restless: 1,
      haunted: 1,
      dead: 1,
      unknown: 0,
      hauntingScore: 75,
    });
  });

  it("caps oversized dependency lists at the maximum", async () => {
    const dependencies: Record<string, string> = {};
    for (let i = 0; i < 60; i += 1) {
      dependencies[`pkg-${i}`] = "^1.0.0";
    }

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL) =>
        new Response(null, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(post({ packageJson: JSON.stringify({ dependencies }) }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packages).toHaveLength(MAX_PACKAGES);
    expect(body.summary.total).toBe(MAX_PACKAGES);
    expect(body.summary.unknown).toBe(MAX_PACKAGES);
    expect(body.summary.hauntingScore).toBe(65);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PACKAGES);
  });

  it("keeps scanning when a single package is unavailable", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("offline-package")) {
        throw new TypeError("network down");
      }
      return new Response(
        JSON.stringify(registryBody("1.0.0", "2015-01-01T00:00:00.000Z")),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      post({
        packageJson: JSON.stringify({
          dependencies: { "offline-package": "^1.0.0", "online-package": "^2.0.0" },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packages).toHaveLength(2);

    const offline = body.packages.find(
      (pkg: { name: string }) => pkg.name === "offline-package",
    );
    expect(offline.status).toBe("unknown");
    expect(body.summary.unknown).toBe(1);
  });

  it("ignores extra body keys", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL) =>
        new Response(null, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      post({
        packageJson: JSON.stringify({ dependencies: { lonely: "^1.0.0" } }),
        unexpected: "ignored",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
