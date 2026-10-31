import { Skeleton } from "@/components/ui/skeleton";

interface LoadingGraveyardProps {
  count?: number;
}

const PULSE = "animate-none motion-safe:animate-pulse";

export function LoadingGraveyard({ count = 6 }: LoadingGraveyardProps) {
  const tombstones = Array.from({ length: count }, (_, index) => index);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-6"
    >
      <span className="sr-only">Raising the graveyard</span>

      <section
        aria-hidden="true"
        className="rounded-xl border border-border/70 bg-card/60 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <Skeleton className={`h-3 w-20 ${PULSE}`} />
            <Skeleton className={`mt-3 h-12 w-28 ${PULSE}`} />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className={`size-24 rounded-full ${PULSE}`} />
            <div>
              <Skeleton className={`h-8 w-16 ${PULSE}`} />
              <Skeleton className={`mt-2 h-3 w-24 ${PULSE}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index}>
              <Skeleton className={`h-3 w-12 ${PULSE}`} />
              <Skeleton className={`mt-2 h-6 w-10 ${PULSE}`} />
            </div>
          ))}
        </div>
      </section>

      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
      >
        {tombstones.map((index) => (
          <div
            key={index}
            className="flex min-h-60 flex-col rounded-b-lg rounded-t-[6.5rem] border border-border/60 bg-card/40 p-6 pt-16"
          >
            <Skeleton className={`h-3 w-16 ${PULSE}`} />
            <Skeleton className={`mt-4 h-7 w-3/4 ${PULSE}`} />
            <Skeleton className={`mt-2 h-7 w-1/2 ${PULSE}`} />
            <div className="mt-auto flex flex-col gap-2 pt-8">
              <Skeleton className={`h-3 w-full ${PULSE}`} />
              <Skeleton className={`h-3 w-5/6 ${PULSE}`} />
              <Skeleton className={`h-3 w-2/3 ${PULSE}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
