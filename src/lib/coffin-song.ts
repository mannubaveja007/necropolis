/**
 * A short, original minor-key loop for the coffin cam. Synthesised with the
 * Web Audio API so nothing copyrighted ships with the repository.
 */
export interface CoffinSong {
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

const BASS = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 98];
const ARP = [220, 261.63, 329.63, 261.63, 220, 261.63, 349.23, 261.63];
const BPM = 126;

export function startCoffinSong(): CoffinSong {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  void ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);

  const beat = 60 / BPM;
  const start = ctx.currentTime + 0.06;

  function tone(freq: number, at: number, dur: number, type: OscillatorType, peak: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  function kick(at: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.16);
    gain.gain.setValueAtTime(0.45, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + 0.22);
  }

  for (let bar = 0; bar < 4; bar += 1) {
    for (let step = 0; step < 8; step += 1) {
      const index = (bar * 8 + step) % 8;
      const at = start + (bar * 8 + step) * (beat / 2);
      tone(BASS[index], at, (beat / 2) * 0.9, "triangle", 0.14);
      if (step % 2 === 1) tone(ARP[index], at, (beat / 2) * 0.5, "square", 0.025);
      if (step % 4 === 0) kick(at);
    }
  }

  function stop() {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 300);
  }

  function setMuted(muted: boolean) {
    master.gain.setTargetAtTime(muted ? 0 : 0.3, ctx.currentTime, 0.03);
  }

  return { stop, setMuted };
}
