import type { PackageStatus, ScanSummary } from "@/lib/types";

interface SummaryBarProps {
  summary: ScanSummary;
}

const COUNTS: Array<{ status: PackageStatus; label: string }> = [
  { status: "alive", label: "Alive" },
  { status: "restless", label: "Restless" },
  { status: "haunted", label: "Haunted" },
  { status: "dead", label: "Dead" },
  { status: "unknown", label: "Unknown" },
];

const TONE: Record<PackageStatus, string> = {
  alive: "text-alive",
  restless: "text-restless",
  haunted: "text-haunted",
  dead: "text-dead",
  unknown: "text-unknown",
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

function HauntingRing({ score }: { score: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg
      viewBox="0 0 120 120"
      className="size-16 shrink-0"
      role="meter"
      aria-label="Haunting score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-valuetext={`${score} out of 100`}
    >
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        className="stroke-border"
        strokeWidth={9}
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        className="stroke-primary"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const score = clampScore(summary.hauntingScore);
  const counts = COUNTS.filter(
    (count) => count.status !== "unknown" || summary.unknown > 0,
  );

  return (
    <section
      aria-label="Kabristan summary"
      className="rounded-xl border border-border/70 bg-card/60 px-5 py-4 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="flex items-baseline gap-2.5">
          <span className="display text-4xl leading-none text-foreground tabular-nums">
            {summary.total}
          </span>
          <span className="text-xs text-muted-foreground">
            headstone{summary.total === 1 ? "" : "s"}
          </span>
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {counts.map((count) => (
            <div key={count.status} className="flex items-baseline gap-2">
              <dt className="text-xs text-muted-foreground">{count.label}</dt>
              <dd
                className={`display text-xl leading-none tabular-nums ${TONE[count.status]}`}
              >
                {summary[count.status]}
              </dd>
            </div>
          ))}
        </dl>

        <div className="ml-auto flex items-center gap-3">
          <HauntingRing score={score} />
          <div>
            <p className="display text-2xl leading-none text-foreground tabular-nums">
              {score}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">haunting score</p>
          </div>
        </div>
      </div>
    </section>
  );
}
