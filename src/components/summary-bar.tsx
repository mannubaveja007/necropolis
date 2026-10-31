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
      className="size-24 shrink-0 sm:size-28"
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
        strokeWidth={7}
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        className="stroke-primary"
        strokeWidth={7}
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
      aria-label="Graveyard summary"
      className="rounded-xl border border-border/70 bg-card/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">total graves</p>
          <p className="display mt-1 text-5xl leading-none text-foreground tabular-nums sm:text-6xl">
            {summary.total}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <HauntingRing score={score} />
          <div className="min-w-0">
            <p className="display text-4xl leading-none text-foreground tabular-nums">
              {score}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">haunting score</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/60 pt-5 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((count) => (
          <div key={count.status} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{count.label}</dt>
            <dd
              className={`display mt-0.5 text-2xl leading-none tabular-nums ${TONE[count.status]}`}
            >
              {summary[count.status]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
