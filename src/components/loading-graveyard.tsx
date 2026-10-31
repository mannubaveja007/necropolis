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
        className="rounded-xl border border-border/70 bg-card/60 px-5 py-4 sm:px-6"
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <Skeleton className={`h-10 w-14 ${PULSE}`} />

          <div className="flex flex-wrap items-center gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-baseline gap-2">
                <Skeleton className={`h-3 w-10 ${PULSE}`} />
                <Skeleton className={`h-5 w-6 ${PULSE}`} />
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Skeleton className={`size-16 rounded-full ${PULSE}`} />
            <div>
              <Skeleton className={`h-6 w-10 ${PULSE}`} />
              <Skeleton className={`mt-1 h-3 w-24 ${PULSE}`} />
            </div>
          </div>
        </div>
      </section>

      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4"
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
