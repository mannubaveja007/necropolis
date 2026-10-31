import { parseDependencies, resolvePackage, summarize } from "@/lib/npm";
import type { ScanResponse } from "@/lib/types";

export const runtime = "nodejs";

const BAD_REQUEST = "Send a JSON body with a packageJson string.";

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: BAD_REQUEST }, { status: 400 });
  }

  const packageJson =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).packageJson
      : undefined;

  if (typeof packageJson !== "string") {
    return Response.json({ error: BAD_REQUEST }, { status: 400 });
  }

  let dependencies;
  try {
    dependencies = parseDependencies(packageJson);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That is not valid JSON.";
    return Response.json({ error: message }, { status: 400 });
  }

  // One unavailable package resolves to an "unknown" tombstone; the scan
  // itself only fails when the package.json is unusable.
  const packages = await Promise.all(
    dependencies.map((dependency) =>
      resolvePackage(dependency.name, dependency.version),
    ),
  );

  const payload: ScanResponse = { packages, summary: summarize(packages) };
  return Response.json(payload);
}
