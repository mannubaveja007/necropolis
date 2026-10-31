"use client";

import type { CSSProperties } from "react";

import type { PackageStatus, ScannedPackage } from "@/lib/types";

const styles = {
  card: "tomb-card",
  slab: "tomb-slab",
  ground: "tomb-ground",
  ghostGlow: "tomb-ghost-glow",
  body: "tomb-body",
  inner: "tomb-inner",
  wisp: "tomb-wisp",
  crack: "tomb-crack",
  plinth: "tomb-plinth",
  moss: "tomb-moss",
  content: "tomb-content",
  status: "tomb-status",
  statusWord: "tomb-status-word",
  name: "tomb-name",
  meta: "tomb-meta",
  metaRow: "tomb-meta-row",
  label: "tomb-label",
  value: "tomb-value",
} as const;

interface TombstoneProps {
  pkg: ScannedPackage;
  index: number;
  onSelect: (pkg: ScannedPackage) => void;
}

const STATUS_LABEL: Record<PackageStatus, string> = {
  alive: "Alive",
  restless: "Restless",
  haunted: "Haunted",
  dead: "Dead",
  unknown: "Unknown",
};

const publishedFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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

export function Tombstone({ pkg, index, onSelect }: TombstoneProps) {
  const published = formatPublished(pkg.lastPublish);
  const enterDelay = `${Math.min(index, 8) * 38}ms`;
  const isDead = pkg.status === "dead";
  const isHaunted = pkg.status === "haunted";

  return (
    <button
      type="button"
      className={styles.card}
      data-status={pkg.status}
      onClick={() => onSelect(pkg)}
      aria-label={`${pkg.name}, ${pkg.status}, last published ${published}`}
      style={{ "--enter-delay": enterDelay } as CSSProperties}
    >
      <svg
        className={styles.slab}
        viewBox="0 0 240 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse className={styles.ground} cx="120" cy="294" rx="104" ry="6" />
        {isHaunted ? (
          <circle className={styles.ghostGlow} cx="120" cy="148" r="86" />
        ) : null}
        <path
          className={styles.body}
          d="M30 274V98C30 51 70 24 120 24s90 27 90 74v176Z"
        />
        <path
          className={styles.inner}
          d="M39 266V100c0-41 36-66 81-66s81 25 81 66v166"
        />
        {isHaunted ? (
          <path className={styles.wisp} d="M150 42c14-18 36-10 44-26" />
        ) : null}
        {isDead ? (
          <>
            <path className={styles.crack} d="M58 86l12 20-8 18 14 24-8 28" />
            <path className={styles.crack} d="M158 56l-8 24 12 18-8 22" />
            <path className={styles.crack} d="M70 106l18 6M76 148l-18 10" />
          </>
        ) : null}
        <path className={styles.plinth} d="M16 264h208l-8 28H24Z" />
        {isDead ? (
          <>
            <ellipse className={styles.moss} cx="52" cy="278" rx="30" ry="11" />
            <ellipse className={styles.moss} cx="100" cy="285" rx="22" ry="7" />
          </>
        ) : null}
      </svg>

      <span className={styles.content}>
        <span className={styles.status}>
          <span className={styles.statusWord}>{STATUS_LABEL[pkg.status]}</span>
        </span>

        <span className={`display min-w-0 ${styles.name}`}>{pkg.name}</span>

        <span className={styles.meta}>
          <span className={styles.metaRow}>
            <span className={styles.label}>version</span>
            <span className={styles.value}>{pkg.version}</span>
          </span>
          <span className={styles.metaRow}>
            <span className={styles.label}>last publish</span>
            <span className={styles.value}>{published}</span>
          </span>
          <span className={styles.metaRow}>
            <span className={styles.label}>years since</span>
            <span className={styles.value}>{formatYears(pkg.yearsSince)}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
