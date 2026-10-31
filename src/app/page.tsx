"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ghost } from "lucide-react";

import { EpitaphPanel } from "@/components/epitaph-panel";
import { LoadingGraveyard } from "@/components/loading-graveyard";
import { SummaryBar } from "@/components/summary-bar";
import { TombstoneGrid } from "@/components/tombstone-grid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildMarkdownReport } from "@/lib/report";
import { SAMPLE_PACKAGE_JSON } from "@/lib/sample";
import type { Epitaph, ScanResponse, ScannedPackage } from "@/lib/types";

type Phase = "idle" | "loading" | "results";

export default function Home() {
  const [raw, setRaw] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScannedPackage | null>(null);
  const [epitaphs, setEpitaphs] = useState<Record<string, Epitaph>>({});
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const loading = phase === "loading";
  const hasResult = phase === "results" && result !== null;

  const scan = useCallback(async () => {
    if (!raw.trim() || loading) return;
    setPhase("loading");
    setError(null);
    setResult(null);
    setSelected(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageJson: raw }),
      });
      const data = (await res.json()) as ScanResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "The graveyard rejected that package.json.");
        setPhase("idle");
        return;
      }
      setResult(data);
      setPhase("results");
    } catch {
      setError("Could not reach the registry. Check your connection and try again.");
      setPhase("idle");
    }
  }, [raw, loading]);

  useEffect(() => {
    if (phase !== "results") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [phase]);

  const loadSample = useCallback(() => {
    setRaw(SAMPLE_PACKAGE_JSON);
    setError(null);
  }, []);

  const startOver = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setSelected(null);
    setError(null);
  }, []);

  const recordEpitaph = useCallback((epitaph: Epitaph) => {
    setEpitaphs((prev) => ({ ...prev, [`${epitaph.name}@${epitaph.version}`]: epitaph }));
  }, []);

  const exportReport = useCallback(() => {
    if (!result) return;
    const markdown = buildMarkdownReport({
      packages: result.packages,
      summary: result.summary,
      epitaphs,
      generatedAt: new Date(),
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kabristan-report-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [result, epitaphs]);

  return (
    <div className="mx-auto w-full max-w-[85rem] px-5 sm:px-8">
      {!hasResult ? (
        <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center py-16 sm:py-20">
          <Ghost
            className="pointer-events-none absolute left-1/2 top-10 z-0 size-[24rem] -translate-x-1/2 text-primary opacity-[0.05] sm:size-[30rem]"
            strokeWidth={0.7}
            aria-hidden
          />
          <div className="relative z-10 mx-auto w-full max-w-2xl">
            <h1 className="display text-[clamp(2.4rem,7vw,4.6rem)] leading-[1.0] text-foreground">
              Every dependency
              <br />
              ends up here.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Paste a package.json; Gemma reads the last rites.
            </p>

            <div className="mt-9 rounded-lg border border-border bg-card/70 shadow-[var(--shadow-slab)] backdrop-blur-sm">
              <label htmlFor="package-json" className="sr-only">
                package.json
              </label>
              <Textarea
                id="package-json"
                spellCheck={false}
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    void scan();
                  }
                }}
                placeholder={`{\n  "dependencies": {\n    "express": "^4.19.2"\n  }\n}`}
                className="carved min-h-56 resize-y rounded-b-none border border-muted-foreground/60 bg-transparent px-4 py-4 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 sm:min-h-64 sm:text-sm"
              />
              <div className="flex flex-col gap-3 border-t border-border/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  Up to 40 dependencies. Only names leave your machine.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={loadSample}
                    disabled={loading}
                    className="h-10 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    Load sample
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void scan()}
                    disabled={loading || raw.trim().length === 0}
                    className="h-10 rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/85"
                  >
                    {loading ? "Raising the dead…" : "Raise the dead"}
                  </Button>
                </div>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            {loading ? (
              <div className="mt-12">
                <LoadingGraveyard count={6} />
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section ref={resultsRef} className="scroll-mt-24 py-8 sm:py-12" aria-busy={loading}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="display text-4xl text-foreground sm:text-5xl">The graveyard</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.summary.total} grave{result.summary.total === 1 ? "" : "s"} raised from your
                package.json
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={exportReport}
                className="h-10 rounded-md border-border bg-transparent text-foreground hover:bg-accent"
              >
                Export graveyard report
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={startOver}
                className="h-10 rounded-md text-muted-foreground hover:text-foreground"
              >
                Bury another
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <SummaryBar summary={result.summary} />
          </div>

          <div className="mt-6">
            <TombstoneGrid packages={result.packages} onSelect={setSelected} />
          </div>
        </section>
      )}

      <EpitaphPanel
        pkg={selected}
        onClose={() => setSelected(null)}
        onEpitaph={recordEpitaph}
      />
    </div>
  );
}
