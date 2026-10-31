"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { startCoffinSong, type CoffinSong } from "@/lib/coffin-song";

interface CoffinCamProps {
  trigger: number;
  onClose: () => void;
}

export function CoffinCam({ trigger, onClose }: CoffinCamProps) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const songRef = useRef<CoffinSong | null>(null);

  useEffect(() => {
    if (trigger === 0) return;

    setOpen(true);
    const song = startCoffinSong();
    songRef.current = song;

    const timer = window.setTimeout(() => {
      setOpen(false);
      song.stop();
      songRef.current = null;
      onClose();
    }, 7000);

    return () => {
      window.clearTimeout(timer);
      song.stop();
      songRef.current = null;
    };
  }, [trigger]);

  function toggleSound() {
    setMuted((current) => {
      const next = !current;
      songRef.current?.setMuted(next);
      return next;
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-background/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Haunted coffin cam"
      onClick={() => {
        setOpen(false);
        songRef.current?.stop();
        onClose();
      }}
    >
      <div
        className="w-[min(92vw,34rem)] overflow-hidden rounded-lg border border-haunted/50 bg-card shadow-[var(--shadow-slab)]"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src="/memes/coffin-dance.webp"
          alt="The coffin dance meme, played when a haunted package rises"
          className="block h-auto w-full border-b border-border/70"
        />
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <div>
            <p className="text-sm text-haunted">haunted · coffin cam</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {muted ? "sound off" : "sound on · original synth loop"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              className="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                songRef.current?.stop();
                onClose();
              }}
              aria-label="Close the coffin cam"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
