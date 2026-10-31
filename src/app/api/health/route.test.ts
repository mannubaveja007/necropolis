import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.stubEnv("OLLAMA_URL", "");
  vi.stubEnv("OLLAMA_MODEL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("reports Ollama up, with the model, endpoint and latency", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ models: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ollama: true,
      model: "gemma3:4b",
      url: "http://localhost:11434/api/generate",
      latencyMs: expect.any(Number),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://localhost:11434/api/tags");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("reports Ollama down when the fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("ECONNREFUSED");
      }),
    );

    const body = await (await GET()).json();

    expect(body).toEqual({
      ollama: false,
      model: "gemma3:4b",
      url: "http://localhost:11434/api/generate",
      latencyMs: null,
    });
  });

  it("reports Ollama down for a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    const body = await (await GET()).json();

    expect(body.ollama).toBe(false);
    expect(body.latencyMs).toBeNull();
  });

  it("strips the generate path and honours environment overrides", async () => {
    vi.stubEnv("OLLAMA_URL", "http://gpu-box:9000/api/generate");
    vi.stubEnv("OLLAMA_MODEL", "llama3:8b");

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response("{}", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = await (await GET()).json();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://gpu-box:9000/api/tags");
    expect(body).toMatchObject({
      ollama: true,
      model: "llama3:8b",
      url: "http://gpu-box:9000/api/generate",
    });
    expect(typeof body.latencyMs).toBe("number");
  });
});
