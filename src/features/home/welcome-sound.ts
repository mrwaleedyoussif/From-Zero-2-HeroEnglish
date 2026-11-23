/**
 * The welcome music, made in the browser (no audio file to download): a soft, slow rising
 * melody over a quiet held chord, about six seconds. Browsers only allow sound after a tap or
 * key press, so this is called from the Start button.
 */
const MELODY: readonly [frequency: number, at: number][] = [
  [523.25, 0.2],
  [659.25, 0.75],
  [783.99, 1.3],
  [987.77, 1.85],
  [1046.5, 2.4],
  [783.99, 3.0],
  [1174.66, 3.55],
  [1318.51, 4.15],
];
const CHORD = [261.63, 392.0, 329.63] as const;
const LENGTH = 6.5;

export function playWelcome(): void {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const start = ctx.currentTime + 0.05;
  // Everything passes through a gentle filter and a low master volume: soft, never sharp.
  const master = ctx.createGain();
  master.gain.value = 0.07;
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 2400;
  soften.connect(master).connect(ctx.destination);

  const voice = (frequency: number, at: number, peak: number, attack: number, hold: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(peak, start + at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + hold);
    osc.connect(gain).connect(soften);
    osc.start(start + at);
    osc.stop(start + at + hold + 0.05);
  };
  for (const frequency of CHORD) voice(frequency, 0, 0.5, 1.2, LENGTH);
  for (const [frequency, at] of MELODY) voice(frequency, at, 1, 0.06, 2.2);
  window.setTimeout(() => void ctx.close(), (LENGTH + 0.6) * 1000);
}
