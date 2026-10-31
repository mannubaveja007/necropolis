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
  statusIcon: "tomb-status-icon",
  meme: "tomb-meme",
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
        viewBox="0 0 280 240"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse className={styles.ground} cx="140" cy="236" rx="120" ry="5" />
        {isHaunted ? (
          <circle className={styles.ghostGlow} cx="140" cy="118" r="78" />
        ) : null}
        <path
          className={styles.body}
          d="M40 212V46c0-14 10-24 24-24h152c14 0 24 10 24 24v166Z"
        />
        <path
          className={styles.inner}
          d="M50 204V52c0-10 8-18 18-18h144c10 0 18 8 18 18v152"
        />
        {isHaunted ? (
          <path className={styles.wisp} d="M182 42c12-16 32-9 39-23" />
        ) : null}
        {isDead ? (
          <>
            <path className={styles.crack} d="M70 70l10 16-7 14 12 20-7 22" />
            <path className={styles.crack} d="M180 50l-6 20 10 14-6 18" />
            <path className={styles.crack} d="M84 96l16 6M78 138l-16 8" />
          </>
        ) : null}
        <path className={styles.plinth} d="M20 204h240l-8 26H28Z" />
        {isDead ? (
          <>
            <ellipse className={styles.moss} cx="66" cy="216" rx="28" ry="10" />
            <ellipse className={styles.moss} cx="112" cy="222" rx="20" ry="6" />
          </>
        ) : null}
      </svg>

      {isHaunted || isDead ? (
        <img
          src="/memes/coffin-dance.webp"
          alt=""
          aria-hidden="true"
          className={styles.meme}
        />
      ) : null}

      <span className={styles.content}>
        <span className={styles.status}>
          <span className={styles.statusWord}>
            {isHaunted ? (
              <svg
                className={styles.statusIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3c3.9 0 7 3.1 7 7v10l-2.3-1.7L14.4 20 12 18.3 9.6 20l-2.3-1.7L5 20V10c0-3.9 3.1-7 7-7Z" />
                <circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none" />
                <circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none" />
              </svg>
            ) : null}
            {isDead ? (
              <svg
                className={styles.statusIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3a8 8 0 0 0-8 8c0 2.7 1.4 4.7 3.8 5.8V21h2.1v-2h4.2v2h2.1v-4.2C18.6 15.7 20 13.7 20 11a8 8 0 0 0-8-8Z" />
                <circle cx="9" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
                <path d="M12 13.2 11 15h2l-1-1.8Z" fill="currentColor" stroke="none" />
              </svg>
            ) : null}
            {STATUS_LABEL[pkg.status]}
          </span>
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
