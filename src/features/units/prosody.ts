/**
 * What a recording of the learner's voice shows about stress and tune, measured in the browser
 * from loudness and pitch over time. A practice guide: it hears strong beats and whether the
 * voice goes up or down, not individual sounds.
 */
export interface Frame {
  /** Loudness of this moment (RMS, 0–1). */
  e: number;
  /** Pitch in Hz, when the voice is sounding. */
  f: number | null;
}
export interface Prosody {
  /** Where the voice goes at the end. */
  tune: "rise" | "fall" | "flat" | null;
  /** Strong beats heard (stressed syllables). */
  beats: number;
  /** Every syllable heard, weak ones too. */
  syllables: number;
  /** How far the strong beats stand out from the rest (0 = flat, 1 = very clear). */
  contrast: number;
  /** How wide the voice moves, in semitones. */
  range: number;
  /** Which syllable was the strongest (0 = the first). */
  peak: number | null;
}

/** The pitch of a short piece of sound (autocorrelation, 80–350 Hz), or null when unvoiced. */
export function pitchOf(samples: Float32Array, rate: number): number | null {
  const step = Math.max(1, Math.round(rate / 12000));
  const x: number[] = [];
  for (let i = 0; i < samples.length; i += step) x.push(samples[i] ?? 0);
  const r = rate / step;
  const power = x.reduce((sum, v) => sum + v * v, 0);
  if (power / x.length < 1e-5) return null;
  let best = 0;
  let bestLag = 0;
  for (let lag = Math.floor(r / 350); lag <= Math.min(Math.ceil(r / 80), x.length - 2); lag++) {
    let sum = 0;
    for (let i = 0; i + lag < x.length; i++) sum += (x[i] ?? 0) * (x[i + lag] ?? 0);
    const score = sum / (power * (1 - lag / x.length));
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }
  return best > 0.5 && bestLag > 0 ? r / bestLag : null;
}

const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 0;

/** Read stress and tune from a recording's frames (about 40 a second); null when too quiet. */
export function analyse(frames: Frame[]): Prosody | null {
  const top = Math.max(0, ...frames.map((f) => f.e));
  if (frames.length < 8 || top < 0.01) return null;
  const loud = frames.map((f) => f.e > top * 0.2);
  const voiced = frames.slice(loud.indexOf(true), loud.lastIndexOf(true) + 1);
  const s = voiced.map(
    (_, i) => ((voiced[i - 1]?.e ?? 0) + (voiced[i]?.e ?? 0) + (voiced[i + 1]?.e ?? 0)) / 3,
  );
  const high = Math.max(...s);
  // A beat: a local top of loudness, well above the floor, with a dip since the last beat.
  const beats: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const v = s[i] ?? 0;
    if (v < high * 0.25) continue;
    if ([1, 2, 3].some((d) => (s[i - d] ?? 0) > v || (s[i + d] ?? 0) >= v)) continue;
    const last = beats.at(-1);
    if (last !== undefined) {
      const dip = Math.min(...s.slice(last, i + 1));
      if (i - last < 5 || dip > Math.min(v, s[last] ?? 0) * 0.8) {
        if (v > (s[last] ?? 0)) beats[beats.length - 1] = i;
        continue;
      }
    }
    beats.push(i);
  }
  const strongest = beats.reduce((a, b) => ((s[b] ?? 0) > (s[a] ?? 0) ? b : a), beats[0] ?? 0);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const notes = voiced.flatMap((f) => (f.f ? [12 * Math.log2(f.f)] : []));
  let tune: Prosody["tune"] = null;
  let range = 0;
  if (notes.length >= 6) {
    const sorted = [...notes].sort((a, b) => a - b);
    range =
      (sorted[Math.floor(sorted.length * 0.9)] ?? 0) -
      (sorted[Math.floor(sorted.length * 0.1)] ?? 0);
    const end = median(notes.slice(Math.floor(notes.length * 0.75)));
    const before = median(
      notes.slice(Math.floor(notes.length * 0.4), Math.floor(notes.length * 0.75)),
    );
    tune = end - before > 1.2 ? "rise" : end - before < -1.2 ? "fall" : "flat";
  }
  return {
    tune,
    beats: beats.filter((b) => (s[b] ?? 0) >= high * 0.6).length,
    syllables: beats.length,
    contrast: Math.round((1 - mean / high) * 100) / 100,
    range: Math.round(range * 10) / 10,
    peak: beats.length ? beats.indexOf(strongest) : null,
  };
}
