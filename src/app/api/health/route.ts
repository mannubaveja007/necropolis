import { ollamaEndpoint, ollamaModel } from "@/lib/epitaph";
import type { HealthResponse } from "@/lib/types";


const HEALTH_TIMEOUT_MS = 3000;

function tagsUrl(): string {
  const base = ollamaEndpoint().replace(/\/api\/generate\/?$/, "");
  return `${base}/api/tags`;
}

export async function GET(): Promise<Response> {
  const url = ollamaEndpoint();
  const startedAt = Date.now();

  let payload: HealthResponse;
  try {
    const response = await fetch(tagsUrl(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    payload = response.ok
      ? {
          ollama: true,
          model: ollamaModel(),
          url,
          latencyMs: Date.now() - startedAt,
        }
      : { ollama: false, model: ollamaModel(), url, latencyMs: null };
  } catch {
    payload = { ollama: false, model: ollamaModel(), url, latencyMs: null };
  }

  return Response.json(payload);
}
