import type { Epitaph, ScanSummary, ScannedPackage } from "./types";

export interface MarkdownReportInput {
  packages: ScannedPackage[];
  summary: ScanSummary;
  epitaphs: Record<string, Epitaph>;
  generatedAt?: Date;
}

const EM_DASH = "—";

/** Escapes a value so it can live inside a Markdown table cell. */
function escapeTableCell(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|");
}

/** Renders an ISO timestamp as YYYY-MM-DD; null or unparseable values become an em dash. */
function formatDate(iso: string | null): string {
  if (!iso) return EM_DASH;

  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  if (isoDate) return isoDate[1];

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return EM_DASH;
  return parsed.toISOString().slice(0, 10);
}

function formatYears(years: number | null): string {
  if (years === null || !Number.isFinite(years)) return EM_DASH;
  return String(Math.round(years * 10) / 10);
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return EM_DASH;
  return String(Math.round(score * 10) / 10);
}

function statusTable(packages: ScannedPackage[]): string {
  const rows = packages.map((pkg) => {
    const cells = [
      escapeTableCell(pkg.name),
      escapeTableCell(pkg.status),
      escapeTableCell(pkg.version),
      formatDate(pkg.lastPublish),
      formatYears(pkg.yearsSince),
    ];
    return `| ${cells.join(" | ")} |`;
  });

  return [
    "| Package | Status | Version | Last publish | Years since publish |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function warningQuote(warning: string): string {
  const lines = warning.split(/\r?\n/);
  const [first, ...rest] = lines;
  return [`> Warning: ${first}`, ...rest.map((line) => `> ${line}`)].join("\n");
}

function epitaphSection(
  packages: ScannedPackage[],
  epitaphs: Record<string, Epitaph>,
): string | null {
  const entries: string[] = [];

  for (const pkg of packages) {
    if (!Object.prototype.hasOwnProperty.call(epitaphs, pkg.name)) continue;

    const epitaph = epitaphs[pkg.name];
    if (!epitaph) continue;

    const source = epitaph.source === "ollama" ? "Ollama" : "template";
    entries.push(
      [
        `### ${pkg.name}@${pkg.version} — ${pkg.status}`,
        epitaph.epitaph,
        warningQuote(epitaph.warning),
        `_Source: ${source}_`,
      ].join("\n\n"),
    );
  }

  if (entries.length === 0) return null;
  return ["## Epitaphs", ...entries].join("\n\n");
}

/**
 * Renders a deterministic Markdown graveyard report.
 *
 * Packages keep their input order in both the status table and the epitaphs
 * section. Packages without an epitaph are omitted from the epitaphs section.
 */
export function buildMarkdownReport({
  packages,
  summary,
  epitaphs,
  generatedAt,
}: MarkdownReportInput): string {
  const blocks: string[] = ["# Necropolis graveyard report"];

  if (generatedAt) {
    const timestamp = generatedAt.getTime();
    if (!Number.isNaN(timestamp)) {
      blocks.push(`Generated: ${generatedAt.toISOString()}`);
    }
  }

  const packageWord = summary.total === 1 ? "package" : "packages";
  blocks.push(
    [
      `**${summary.total} ${packageWord}**`,
      `alive ${summary.alive}`,
      `restless ${summary.restless}`,
      `haunted ${summary.haunted}`,
      `dead ${summary.dead}`,
      `unknown ${summary.unknown}`,
      `**Haunting Score: ${formatScore(summary.hauntingScore)}/100**`,
    ].join(" · "),
  );

  blocks.push("## Status", statusTable(packages));

  const epitaphsBlock = epitaphSection(packages, epitaphs);
  if (epitaphsBlock) blocks.push(epitaphsBlock);

  return `${blocks.join("\n\n")}\n`;
}
