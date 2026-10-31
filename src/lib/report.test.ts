import { describe, expect, it } from "vitest";

import { buildMarkdownReport } from "./report";
import type { ScannedPackage, ScanSummary } from "./types";

function makePackage(overrides: Partial<ScannedPackage> = {}): ScannedPackage {
  return {
    name: "react",
    version: "^19.0.0",
    latest: "19.3.0",
    lastPublish: "2025-12-01T10:00:00.000Z",
    yearsSince: 0.9,
    deprecatedMessage: null,
    status: "alive",
    ...overrides,
  };
}

const baseSummary: ScanSummary = {
  total: 4,
  alive: 1,
  restless: 0,
  haunted: 1,
  dead: 1,
  unknown: 1,
  hauntingScore: 62.5,
};

describe("buildMarkdownReport", () => {
  it("renders the title, deterministic UTC timestamp, summary, and status table", () => {
    const packages = [
      makePackage(),
      makePackage({
        name: "request",
        version: "^2.88.2",
        lastPublish: "2020-02-11T00:00:00.000Z",
        yearsSince: 6.7,
        deprecatedMessage: "request has been deprecated",
        status: "haunted",
      }),
      makePackage({
        name: "node-sass",
        version: "^9.0.0",
        lastPublish: "2022-02-08T00:00:00.000Z",
        yearsSince: 4.7,
        status: "dead",
      }),
      makePackage({
        name: "vanished",
        version: "^0.0.0",
        latest: null,
        lastPublish: null,
        yearsSince: null,
        status: "unknown",
      }),
    ];
    const generatedAt = new Date("2026-10-31T12:34:56.789Z");

    const report = buildMarkdownReport({
      packages,
      summary: baseSummary,
      epitaphs: {},
      generatedAt,
    });

    expect(report).toContain("# Necropolis graveyard report");
    expect(report).toContain("Generated: 2026-10-31T12:34:56.789Z");
    expect(report).toContain(
      "**4 packages** · alive 1 · restless 0 · haunted 1 · dead 1 · unknown 1 · **Haunting Score: 62.5/100**",
    );
    expect(report).toContain("## Status");
    expect(report).toContain(
      "| Package | Status | Version | Last publish | Years since publish |",
    );
    expect(report).toContain("| react | alive | ^19.0.0 | 2025-12-01 | 0.9 |");
    expect(report).toContain("| request | haunted | ^2.88.2 | 2020-02-11 | 6.7 |");
    expect(report).toContain("| node-sass | dead | ^9.0.0 | 2022-02-08 | 4.7 |");

    expect(
      buildMarkdownReport({ packages, summary: baseSummary, epitaphs: {}, generatedAt }),
    ).toBe(report);
    expect(report.match(/Generated:/g)).toHaveLength(1);
  });

  it("escapes pipe characters in table cells", () => {
    const report = buildMarkdownReport({
      packages: [
        makePackage({
          name: "@scope/tomb|stone",
          version: "1.0.0|next",
          lastPublish: "2024-01-02T03:04:05.000Z",
          yearsSince: 1.5,
        }),
      ],
      summary: { ...baseSummary, total: 1 },
      epitaphs: {},
    });

    expect(report).toContain(
      "| @scope/tomb\\|stone | alive | 1.0.0\\|next | 2024-01-02 | 1.5 |",
    );
  });

  it("renders em dashes for null values and keeps dates at YYYY-MM-DD", () => {
    const report = buildMarkdownReport({
      packages: [
        makePackage({
          name: "vanished",
          version: "^0.0.0",
          latest: null,
          lastPublish: null,
          yearsSince: null,
          status: "unknown",
        }),
        makePackage({
          name: "dated",
          version: "1.0.0",
          lastPublish: "2024-03-04T23:59:59.000Z",
          yearsSince: 2.3,
        }),
      ],
      summary: baseSummary,
      epitaphs: {},
    });

    expect(report).toContain("| vanished | unknown | ^0.0.0 | — | — |");
    expect(report).toContain("| dated | alive | 1.0.0 | 2024-03-04 | 2.3 |");
    expect(report).not.toContain("T23:59:59");
  });

  it("includes only packages with epitaphs, in input order", () => {
    const packages = [
      makePackage({ name: "alpha", version: "1.0.0", status: "dead" }),
      makePackage({ name: "beta", version: "2.0.0", status: "alive" }),
      makePackage({ name: "gamma", version: "3.0.0", status: "restless" }),
      makePackage({ name: "constructor", version: "4.0.0", status: "dead" }),
    ];

    const report = buildMarkdownReport({
      packages,
      summary: { ...baseSummary, total: 4 },
      epitaphs: {
        gamma: {
          name: "gamma",
          version: "3.0.0",
          epitaph: "Still wandering the registry.",
          warning: "Last rites are overdue.",
          source: "ollama",
        },
        alpha: {
          name: "alpha",
          version: "1.0.0",
          epitaph: "Here lies a dependency of another age.",
          warning: "Do not install after midnight.",
          source: "template",
        },
        unlisted: {
          name: "unlisted",
          version: "0.0.1",
          epitaph: "Not part of this graveyard.",
          warning: "Should never appear.",
          source: "template",
        },
      },
    });

    expect(report).toContain("## Epitaphs");
    expect(report).toContain("### alpha@1.0.0 — dead");
    expect(report).toContain("### gamma@3.0.0 — restless");
    expect(report).not.toContain("### beta@2.0.0");
    expect(report).not.toContain("### constructor@4.0.0");
    expect(report).not.toContain("unlisted");
    expect(report.indexOf("### alpha@1.0.0 — dead")).toBeLessThan(
      report.indexOf("### gamma@3.0.0 — restless"),
    );
    expect(report).toContain("> Warning: Do not install after midnight.");
    expect(report).toContain("> Warning: Last rites are overdue.");
    expect(report).toContain("_Source: template_");
    expect(report).toContain("_Source: Ollama_");
    expect(report.indexOf("## Status")).toBeLessThan(report.indexOf("## Epitaphs"));
  });

  it("handles empty input without inventing epitaphs", () => {
    const report = buildMarkdownReport({
      packages: [],
      summary: {
        total: 0,
        alive: 0,
        restless: 0,
        haunted: 0,
        dead: 0,
        unknown: 0,
        hauntingScore: 0,
      },
      epitaphs: {},
    });

    expect(report).toContain("# Necropolis graveyard report");
    expect(report).toContain("**0 packages**");
    expect(report).toContain("**Haunting Score: 0/100**");
    expect(report).toContain(
      "| Package | Status | Version | Last publish | Years since publish |",
    );
    expect(report).not.toContain("## Epitaphs");
    expect(report).not.toContain("Generated:");
    expect(report).not.toContain("| react |");
    expect(report.endsWith("\n")).toBe(true);
  });
});
