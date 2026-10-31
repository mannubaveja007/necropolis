"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ghost } from "lucide-react";

import type { HealthResponse } from "@/lib/types";

type Health = HealthResponse | null;

export function SiteHeader() {
  const [health, setHealth] = useState<Health>(null);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as HealthResponse;
        if (alive) setHealth(data);
      } catch {
        if (alive) setHealth({ ollama: false, model: "", url: "", latencyMs: null });
      }
    }

    check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const online = health?.ollama === true;
  const known = health !== null;
  const label = !known ? "Checking Ollama" : online ? "Ollama online" : "Ollama offline";
  const detail = known && health?.model ? `model ${health.model}` : "no model response";

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[85rem] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-baseline gap-3 rounded-sm focus-visible:outline-none"
          aria-label="Kabristan, back to the gate"
        >
          <Ghost
            className="size-5 shrink-0 self-center text-primary"
            strokeWidth={1.4}
            aria-hidden
          />
          <span className="display text-2xl leading-none text-foreground sm:text-[1.7rem]">
            Kabristan
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            a graveyard for dependencies
          </span>
        </Link>

        <div
          className="flex items-center gap-2.5 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex size-2.5">
            <span
              className={[
                "relative size-2.5 rounded-full transition-colors",
                !known ? "bg-muted-foreground/60" : online ? "bg-alive" : "bg-destructive",
              ].join(" ")}
              aria-hidden
            />
          </span>
          <span className="hidden sm:inline">{label}</span>
          <span className="carved hidden text-xs text-muted-foreground/70 md:inline">{detail}</span>
        </div>
      </div>
    </header>
  );
}
