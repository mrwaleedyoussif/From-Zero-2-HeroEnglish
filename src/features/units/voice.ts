/**
 * The device's own voice, used when a unit has no recording: the most natural English voice
 * the device offers, at a pace that suits the unit's level, one sentence at a time.
 */
const PACE: Record<string, number> = {
  A1: 0.72,
  "A1+": 0.76,
  A2: 0.8,
  "A2+": 0.84,
  B1: 0.88,
  "B1+": 0.91,
  B2: 0.95,
  "B2+": 0.97,
  C1: 1,
  C2: 1,
};

/** How fast to speak for a level (1 = the voice's normal speed). */
export const paceFor = (level?: string): number => PACE[level ?? ""] ?? 0.85;

type VoiceLike = { name: string; lang: string };

/** Higher = sounds more like a person. Not English = never used. */
export function voiceScore(v: VoiceLike): number {
  if (!/^en[-_]/i.test(v.lang)) return -1;
  const n = v.name.toLowerCase();
  let score = 1;
  if (/natural|neural/.test(n)) score += 6;
  else if (/premium|enhanced|siri/.test(n)) score += 5;
  else if (/online|google/.test(n)) score += 4;
  else if (/samantha|daniel|serena|karen|moira|ava|libby|sonia|ryan/.test(n)) score += 2;
  if (/espeak|compact|eloquence|novelty/.test(n)) score -= 3;
  if (/^en[-_]gb/i.test(v.lang)) score += 1;
  else if (/^en[-_]us/i.test(v.lang)) score += 0.5;
  return score;
}

/** The device's English voices, best first. */
export function rankVoices<V extends VoiceLike>(voices: V[]): V[] {
  return voices
    .filter((v) => voiceScore(v) > 0)
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

/** Sentences, so the voice breathes between them instead of running on. */
export const sentences = (text: string): string[] =>
  (text.match(/[^.!?…]+[.!?…]+["'”’)]*|[^.!?…]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);

let level: string | undefined;
/** The unit on screen sets its level; every Listen button on the page follows it. */
export const setSpeechLevel = (l?: string) => void (level = l);

/** The learner's own choice of speed (Voice speed buttons), kept on the device. */
export const SPEEDS = [0.6, 0.8, 1, 1.2] as const;
let speed = 1;
const watchers = new Set<() => void>();
export const voiceSpeed = () => speed;
export function setVoiceSpeed(v: number, save = true) {
  speed = (SPEEDS as readonly number[]).includes(v) ? v : 1;
  try {
    if (save) localStorage.setItem("voiceSpeed", String(speed));
  } catch {
    // private browsing: the choice lasts for this page only
  }
  watchers.forEach((w) => w());
}
export function watchVoiceSpeed(w: () => void) {
  watchers.add(w);
  return () => void watchers.delete(w);
}

/**
 * Queue one speaker's line. `speaker` picks a different voice for each person when the device
 * has more than one good voice; `slow` is for shadowing; `natural` says a word or
 * phrase at the voice's own normal speed, whatever the level (vocabulary).
 */
export function speak(
  text: string,
  opts: { speaker?: number; slow?: boolean; natural?: boolean; onEnd?: () => void },
) {
  const synth = window.speechSynthesis;
  const ranked = rankVoices(synth.getVoices());
  const top = ranked[0] ? voiceScore(ranked[0]) : 0;
  const good = ranked.filter((v) => voiceScore(v) >= top - 1).slice(0, 3);
  const who = opts.speaker ?? 0;
  const voice = good.length ? good[who % good.length] : undefined;
  const parts = sentences(text);
  parts.forEach((part, i) => {
    const say = new SpeechSynthesisUtterance(part);
    if (voice) say.voice = voice;
    say.lang = voice?.lang ?? "en-GB";
    say.rate = opts.natural ? 1 : paceFor(level) * (opts.slow ? 0.9 : 1) * speed;
    // One voice for several people: a small change of pitch tells them apart.
    say.pitch = good.length > 1 ? 1 : ([1, 0.9, 1.1][who % 3] ?? 1);
    if (i === parts.length - 1 && opts.onEnd) say.onend = opts.onEnd;
    synth.speak(say);
  });
}
