/** Short feedback sounds made in the browser (no files): bright for success, soft for "try again". */
const TUNES = {
  great: [
    [659.25, 0],
    [783.99, 0.12],
    [1046.5, 0.24],
    [1318.51, 0.4],
  ],
  good: [
    [587.33, 0],
    [783.99, 0.16],
  ],
  // Gentle and level, never a buzzer: two soft notes that settle.
  tryAgain: [
    [440, 0],
    [392, 0.22],
  ],
} as const;

export type Cheer = keyof typeof TUNES;

/** Sound is off when the learner switched it off on the home page. */
export function soundOn(): boolean {
  try {
    return localStorage.getItem("z2h-muted") !== "1";
  } catch {
    return true;
  }
}

export function playCheer(kind: Cheer): void {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx || !soundOn()) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = kind === "tryAgain" ? 0.06 : 0.1;
  master.connect(ctx.destination);
  const start = ctx.currentTime + 0.03;
  for (const [frequency, at] of TUNES[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === "tryAgain" ? "sine" : "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(1, start + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.7);
    osc.connect(gain).connect(master);
    osc.start(start + at);
    osc.stop(start + at + 0.75);
  }
  window.setTimeout(() => void ctx.close(), 1800);
}
