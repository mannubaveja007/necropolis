"use client";

import type { ScannedPackage } from "@/lib/types";

import { Tombstone } from "@/components/tombstone";

interface TombstoneGridProps {
  packages: ScannedPackage[];
  onSelect: (pkg: ScannedPackage) => void;
}

export function TombstoneGrid({ packages, onSelect }: TombstoneGridProps) {
  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
    >
      {packages.map((pkg, index) => (
        <li
          role="listitem"
          key={`${pkg.name}@${pkg.version}-${index}`}
          className="min-w-0"
        >
          <Tombstone pkg={pkg} index={index} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
