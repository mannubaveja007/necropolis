"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Epitaph, ScannedPackage } from "@/lib/types";

type PanelState =
  | { status: "loading" }
  | { status: "ready"; epitaph: Epitaph }
  | { status: "error"; message: string };

interface EpitaphPanelProps {
  pkg: ScannedPackage | null;
  onClose: () => void;
  onEpitaph?: (epitaph: Epitaph) => void;
}

interface EpitaphContentProps {
  pkg: ScannedPackage;
  active: boolean;
  cache: { current: Map<string, Epitaph> };
  onEpitaph?: (epitaph: Epitaph) => void;
}

const publishedFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const PULSE = "animate-none motion-safe:animate-pulse";

function formatPublished(value: string | null): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return publishedFormat.format(date);
}

function formatYears(value: number | null): string {
  if (value === null) return "unknown";
  return `${value.toFixed(1)} years`;
}

function parseEpitaph(
  value: unknown,
  fallbackName: string,
  fallbackVersion: string,
): Epitaph | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (typeof record.epitaph !== "string" || typeof record.warning !== "string") {
    return null;
  }
  if (record.source !== "ollama" && record.source !== "template") return null;

  return {
    name:
      typeof record.name === "string" && record.name.length > 0
        ? record.name
        : fallbackName,
    version:
      typeof record.version === "string" && record.version.length > 0
        ? record.version
        : fallbackVersion,
    epitaph: record.epitaph,
    warning: record.warning,
    source: record.source,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      if (typeof record.error === "string" && record.error.trim().length > 0) {
        return record.error;
      }
      if (
        typeof record.message === "string" &&
        record.message.trim().length > 0
      ) {
        return record.message;
      }
    }
  } catch {
    // The response had no readable body; fall back to a plain sentence.
  }
  return "The ghost did not answer. Try again in a moment.";
}

function describeError(error: unknown): string {
  if (error instanceof TypeError) {
    return "Could not reach the ghost. Check your connection and try again.";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "The epitaph could not be written. Try again.";
}

function EpitaphSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span role="status" className="sr-only">
        Writing the epitaph
      </span>
      <Skeleton className={`h-5 w-11/12 ${PULSE}`} />
      <Skeleton className={`h-5 w-full ${PULSE}`} />
      <Skeleton className={`h-5 w-4/5 ${PULSE}`} />
      <Skeleton className={`mt-2 h-24 w-full ${PULSE}`} />
    </div>
  );
}

function EpitaphContent({
  pkg,
  active,
  cache,
  onEpitaph,
}: EpitaphContentProps) {
  const { name, version, lastPublish, yearsSince, deprecatedMessage } = pkg;
  const cacheKey = `${name}@${version}`;

  const [state, setState] = useState<PanelState>(() => {
    const cached = cache.current.get(cacheKey);
    return cached ? { status: "ready", epitaph: cached } : { status: "loading" };
  });
  const [attempt, setAttempt] = useState(0);
  const onEpitaphRef = useRef(onEpitaph);

  useEffect(() => {
    onEpitaphRef.current = onEpitaph;
  }, [onEpitaph]);

  useEffect(() => {
    if (!active) return;
    if (cache.current.has(cacheKey)) return;

    const controller = new AbortController();
    let live = true;

    async function summon() {
      try {
        const response = await fetch("/api/epitaph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            version,
            lastPublish,
            yearsSince,
            deprecatedMessage,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const epitaph = parseEpitaph(await response.json(), name, version);
        if (!epitaph) {
          throw new Error("The epitaph came back unreadable. Try again.");
        }

        if (!live || controller.signal.aborted) return;

        cache.current.set(cacheKey, epitaph);
        onEpitaphRef.current?.(epitaph);
        setState({ status: "ready", epitaph });
      } catch (error) {
        if (!live || controller.signal.aborted) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ status: "error", message: describeError(error) });
      }
    }

    void summon();

    return () => {
      live = false;
      controller.abort();
    };
  }, [
    active,
    attempt,
    cache,
    cacheKey,
    deprecatedMessage,
    lastPublish,
    name,
    version,
    yearsSince,
  ]);

  function retry() {
    cache.current.delete(cacheKey);
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  return (
    <>
      <SheetHeader className="gap-1 border-b border-border/70 p-5 pr-12 sm:p-6 sm:pr-14">
        <SheetTitle className="display min-w-0 break-words text-3xl leading-tight">
          {name}
        </SheetTitle>
        <SheetDescription className="carved flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>version {version}</span>
          <span>last publish {formatPublished(lastPublish)}</span>
          <span>years since {formatYears(yearsSince)}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {state.status === "loading" ? <EpitaphSkeleton /> : null}

        {state.status === "error" ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          >
            <p className="text-sm leading-relaxed text-foreground">
              {state.message}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={retry}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <div className="flex flex-col gap-6">
            {state.epitaph.source === "template" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-restless/40 bg-restless/5 p-3">
                <p className="text-sm text-restless">
                  Ghost offline: template epitaph
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retry}
                >
                  Retry
                </Button>
              </div>
            ) : null}

            <p className="display text-2xl leading-snug text-foreground sm:text-[1.7rem]">
              {state.epitaph.epitaph}
            </p>

            {state.epitaph.warning ? (
              <aside className="rounded-lg border border-ember/40 bg-ember/5 p-4">
                <p className="text-xs text-ember">warning</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                  {state.epitaph.warning}
                </p>
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>

      {state.status === "ready" ? (
        <SheetFooter className="border-t border-border/70 p-5 sm:p-6">
          <p className="text-xs text-muted-foreground">
            {state.epitaph.source === "ollama"
              ? "Written by Gemma via Ollama"
              : "Template epitaph"}
          </p>
        </SheetFooter>
      ) : null}
    </>
  );
}

export function EpitaphPanel({ pkg, onClose, onEpitaph }: EpitaphPanelProps) {
  const cache = useRef(new Map<string, Epitaph>());
  const [lastPkg, setLastPkg] = useState<ScannedPackage | null>(pkg);

  // Adjust during render so a new selection never flashes the previous
  // epitaph, and keep the last package while the sheet animates closed.
  const pkgKey = pkg ? `${pkg.name}@${pkg.version}` : null;
  const lastKey = lastPkg ? `${lastPkg.name}@${lastPkg.version}` : null;
  if (pkg && pkgKey !== lastKey) {
    setLastPkg(pkg);
  }

  const shownPkg = pkg ?? lastPkg;

  return (
    <Sheet
      open={pkg !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {shownPkg ? (
          <EpitaphContent
            key={`${shownPkg.name}@${shownPkg.version}`}
            pkg={shownPkg}
            active={pkg !== null}
            cache={cache}
            onEpitaph={onEpitaph}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
