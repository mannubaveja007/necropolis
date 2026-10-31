import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/epitaph/route";
import { __clearEpitaphCache } from "@/lib/epitaph";

function post(body: unknown): Request {
  return new Request("http://localhost/api/epitaph", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postRaw(body: string): Request {
  return new Request("http://localhost/api/epitaph", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function ollamaResponse(answer: string): Response {
  return new Response(JSON.stringify({ response: answer }), { status: 200 });
}

const facts = {
  name: "request",
  version: "^2.88.2",
  lastPublish: "2020-02-11T00:00:00.000Z",
  yearsSince: 5.6,
  deprecatedMessage: "request has been deprecated",
};

beforeEach(() => {
  __clearEpitaphCache();
});

afterEach(() => {
  __clearEpitaphCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/epitaph", () => {
  it("returns 400 for a body that is not JSON", async () => {
    const response = await POST(postRaw("nope"));

    expect(response.status).toBe(400);
    expect(typeof (await response.json()).error).toBe("string");
  });

  it("returns 400 unless name and version are non-empty strings", async () => {
    const bodies = [
      {},
      { name: "react" },
      { version: "19.0.0" },
      { name: "", version: "1.0.0" },
      { name: "   ", version: "1.0.0" },
      { name: "react", version: "" },
      { name: "react", version: 19 },
      [],
      "react",
      null,
    ];

    for (const body of bodies) {
      const response = await POST(post(body));
      expect(response.status).toBe(400);
      expect(typeof (await response.json()).error).toBe("string");
    }
  });

  it("returns the model's epitaph with source ollama", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ollamaResponse(
          JSON.stringify({
            epitaph: "Here lies request, unloved but not forgotten.",
            warning: "Prefer fetch; the successor is unknown.",
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      post({ ...facts, ignoredExtraKey: "must never reach the model" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      name: "request",
      version: "^2.88.2",
      epitaph: "Here lies request, unloved but not forgotten.",
      warning: "Prefer fetch; the successor is unknown.",
      source: "ollama",
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const sent = JSON.parse(String(init?.body));
    const prompt = String(sent.prompt);
    expect(prompt).toBe(
      `Facts: ${JSON.stringify(facts)}\nReturn JSON only.`,
    );
  });

  it("normalises missing optional facts to null", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ollamaResponse(
          JSON.stringify({ epitaph: "Bare facts.", warning: "Bare warning." }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      post({
        name: "ghost",
        version: "1.0.0",
        lastPublish: 42,
        yearsSince: "many",
        deprecatedMessage: 7,
      }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const sent = JSON.parse(String(init?.body));
    expect(sent.prompt).toContain(
      JSON.stringify({
        name: "ghost",
        version: "1.0.0",
        lastPublish: null,
        yearsSince: null,
        deprecatedMessage: null,
      }),
    );
  });

  it("returns a template epitaph with status 200 when Ollama fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("connection refused");
      }),
    );

    const response = await POST(
      post({
        name: "left-pad",
        version: "1.3.0",
        lastPublish: "2018-04-01T00:00:00.000Z",
        yearsSince: 7,
        deprecatedMessage: null,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("template");
    expect(body.warning.endsWith("successor unknown.")).toBe(true);
    expect(body.epitaph).toContain("left-pad");
    expect(body.epitaph).toContain("2018-04-01");
  });

  it("serves repeat requests for the same package from the cache", async () => {
    const fetchMock = vi.fn(async () =>
      ollamaResponse(JSON.stringify({ epitaph: "Once.", warning: "Once." })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await POST(post(facts));
    const second = await POST(post(facts));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
