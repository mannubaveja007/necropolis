import { epitaphFor, templateEpitaph } from "@/lib/epitaph";
import type { Epitaph, EpitaphRequest } from "@/lib/types";


const BAD_REQUEST = "Send a JSON body with non-empty name and version strings.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: BAD_REQUEST }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: BAD_REQUEST }, { status: 400 });
  }

  const { name, version } = body;
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof version !== "string" ||
    version.trim() === ""
  ) {
    return Response.json({ error: BAD_REQUEST }, { status: 400 });
  }

  // Only the EpitaphRequest contract is forwarded; any extra body keys are
  // dropped so the model never sees invented facts.
  const facts: EpitaphRequest = {
    name,
    version,
    lastPublish:
      typeof body.lastPublish === "string" ? body.lastPublish : null,
    yearsSince:
      typeof body.yearsSince === "number" && Number.isFinite(body.yearsSince)
        ? body.yearsSince
        : null,
    deprecatedMessage:
      typeof body.deprecatedMessage === "string" &&
      body.deprecatedMessage.trim() !== ""
        ? body.deprecatedMessage
        : null,
  };

  let epitaph: Epitaph;
  try {
    epitaph = await epitaphFor(facts);
  } catch {
    // epitaphFor already degrades gracefully; this is belt and braces.
    epitaph = templateEpitaph(facts);
  }

  return Response.json(epitaph);
}
