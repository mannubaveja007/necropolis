"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Volume2, VolumeX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { templateEpitaph } from "@/lib/epitaph";
import { startCoffinSong, type CoffinSong } from "@/lib/coffin-song";
import type { Epitaph, ScannedPackage } from "@/lib/types";

type PanelState =
  | { status: "loading" }
  | { status: "ready"; epitaph: Epitaph; pending?: boolean }
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

  const facts = { name, version, lastPublish, yearsSince, deprecatedMessage };

  const [state, setState] = useState<PanelState>(() => {
    const cached = cache.current.get(cacheKey);
    return cached
      ? { status: "ready", epitaph: cached, pending: false }
      : {
          status: "ready",
          epitaph: templateEpitaph(facts),
          pending: true,
        };
  });
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
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
        setState({ status: "ready", epitaph, pending: false });
      } catch (error) {
        if (!live || controller.signal.aborted) return;
        if (error instanceof Error && error.name === "AbortError") return;
        // Keep the template already on screen; the model is simply unavailable.
        setState({ status: "ready", epitaph: templateEpitaph(facts), pending: false });
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

  useEffect(() => {
    const working =
      state.status === "loading" ||
      (state.status === "ready" && state.pending === true);
    if (!working) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  function retry() {
    cache.current.delete(cacheKey);
    setElapsed(0);
    setState({ status: "ready", epitaph: templateEpitaph(facts), pending: true });
    setAttempt((value) => value + 1);
  }

  async function useTemplate() {
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
          template: true,
        }),
      });
      if (!response.ok) return;
      const epitaph = parseEpitaph(await response.json(), name, version);
      if (!epitaph) return;
      cache.current.set(cacheKey, epitaph);
      onEpitaphRef.current?.(epitaph);
      setState({ status: "ready", epitaph });
    } catch {
      // The skeleton stays; the main request may still land.
    }
  }

  return (
    <>
      <header className="shrink-0 border-b border-border/70 p-5 pr-14 sm:p-6 sm:pr-16">
        <h2
          id="epitaph-title"
          className="display min-w-0 break-words text-3xl leading-tight"
        >
          {name}
        </h2>
        <p className="carved mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>version {version}</span>
          <span>last publish {formatPublished(lastPublish)}</span>
          <span>years since {formatYears(yearsSince)}</span>
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {state.status === "loading" ? (
          <div className="flex flex-col gap-4">
            <EpitaphSkeleton />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Gemma is reading the stones · {elapsed}s. A local 12B model can take about a minute.
            </p>
            {elapsed >= 6 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => void useTemplate()}
              >
                Use the template instead
              </Button>
            ) : null}
          </div>
        ) : null}

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
            {state.pending ? (
              <p className="text-xs text-muted-foreground">
                Asking Gemma · {elapsed}s · showing the template meanwhile.
              </p>
            ) : null}

            {state.epitaph.source === "template" && !state.pending ? (
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

            <p className="display break-words text-2xl leading-snug text-foreground sm:text-[1.7rem]">
              {state.epitaph.epitaph}
            </p>

            {state.epitaph.warning ? (
              <aside className="rounded-lg border border-ember/40 bg-ember/5 p-4">
                <p className="text-xs text-ember">warning</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-foreground/90">
                  {state.epitaph.warning}
                </p>
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>

      {state.status === "ready" ? (
        <footer className="shrink-0 border-t border-border/70 p-5 sm:p-6">
          <p className="text-xs text-muted-foreground">
            {state.pending
              ? "Asking Gemma…"
              : state.epitaph.source === "ollama"
                ? "Written by Gemma via Ollama"
                : "Template epitaph"}
          </p>
        </footer>
      ) : null}
    </>
  );
}

export function EpitaphPanel({ pkg, onClose, onEpitaph }: EpitaphPanelProps) {
  const cache = useRef(new Map<string, Epitaph>());
  const [lastPkg, setLastPkg] = useState<ScannedPackage | null>(pkg);

  // Keep the last package while the dialog closes, so the content does not
  // flash empty during the exit.
  const pkgKey = pkg ? `${pkg.name}@${pkg.version}` : null;
  const lastKey = lastPkg ? `${lastPkg.name}@${lastPkg.version}` : null;
  if (pkg && pkgKey !== lastKey) {
    setLastPkg(pkg);
  }

  const shownPkg = pkg ?? lastPkg;
  const open = pkg !== null;
  const haunted =
    shownPkg?.status === "haunted" || shownPkg?.status === "dead";
  const [muted, setMuted] = useState(false);
  const songRef = useRef<CoffinSong | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songKey = shownPkg ? `${shownPkg.name}@${shownPkg.version}` : null;

  useEffect(() => {
    if (!open || !haunted) return;

    let cancelled = false;
    setMuted(false);

    // A licensed track dropped at /audio/coffin.mp3 (gitignored) wins;
    // otherwise the original synth loop plays.
    const audio = new Audio("/audio/coffin.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    audio
      .play()
      .then(() => {
        if (cancelled) audio.pause();
      })
      .catch(() => {
        if (cancelled) return;
        const song = startCoffinSong();
        songRef.current = song;
      });

    return () => {
      cancelled = true;
      audio.pause();
      audioRef.current = null;
      songRef.current?.stop();
      songRef.current = null;
    };
  }, [open, haunted, songKey]);

  function toggleSound() {
    setMuted((current) => {
      const next = !current;
      if (audioRef.current) audioRef.current.muted = next;
      songRef.current?.setMuted(next);
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !shownPkg) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-background/75 p-4 backdrop-blur-sm sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="epitaph-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[88vh] w-[min(94vw,42rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-slab)]"
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-md border border-border/70 bg-background/85 p-0.5 backdrop-blur-sm">
          {haunted ? (
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              aria-label={muted ? "Unmute the coffin cam" : "Mute the coffin cam"}
              className="rounded p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
            >
              {muted ? (
                <VolumeX className="size-4" aria-hidden />
              ) : (
                <Volume2 className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the epitaph"
            autoFocus
            className="rounded p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {haunted ? (
          <div className="relative shrink-0 border-b border-border/70">
            <img
              src="/memes/coffin-dance.gif"
              alt="The coffin dance meme, played for a haunted package"
              className="max-h-[22vh] w-full object-cover"
            />
            <p className="absolute bottom-2 left-3 rounded bg-background/80 px-2 py-0.5 text-[11px] text-haunted">
              haunted · coffin cam
            </p>
          </div>
        ) : null}

        <EpitaphContent
          key={`${shownPkg.name}@${shownPkg.version}`}
          pkg={shownPkg}
          active={open}
          cache={cache}
          onEpitaph={onEpitaph}
        />
      </div>
    </div>,
    document.body,
  );
}
