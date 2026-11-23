/**
 * The welcome chime, made in the browser (no audio file to download): a rising four-note
 * arpeggio with a soft sparkle on top. Browsers only allow sound after a tap or key press, so
 * this is called from the Start button.
 */
const NOTES: readonly [frequency: number, at: number][] = [
  [523.25, 0],
  [659.25, 0.13],
  [783.99, 0.26],
  [1046.5, 0.42],
  [1567.98, 0.6],
];

export function playWelcome(): void {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  const start = ctx.currentTime + 0.03;
  for (const [frequency, at] of NOTES) {
    for (const [type, level, octave] of [
      ["triangle", 1, 1],
      ["sine", 0.35, 2],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency * octave;
      gain.gain.setValueAtTime(0.0001, start + at);
      gain.gain.exponentialRampToValueAtTime(level, start + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 1.1);
      osc.connect(gain).connect(master);
      osc.start(start + at);
      osc.stop(start + at + 1.2);
    }
  }
  window.setTimeout(() => void ctx.close(), 2600);
}
