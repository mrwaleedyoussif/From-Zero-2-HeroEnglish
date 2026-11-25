import { type Frame, pitchOf } from "../prosody";

export interface Capture {
  /** Stop listening: the measured frames and a link to play the recording back. */
  stop: () => Promise<{ frames: Frame[]; url: string | null }>;
}

/**
 * Listen to the microphone while the learner speaks: loudness and pitch about 40 times a second
 * (for stress and tune), and a recording they can play back. Phones cannot share the microphone
 * between this and speech recognition, so there it is skipped and only the words are checked.
 */
export async function startCapture(): Promise<Capture | null> {
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return null;
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const frames: Frame[] = [];
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (const v of buffer) sum += v * v;
      frames.push({ e: Math.sqrt(sum / buffer.length), f: pitchOf(buffer, context.sampleRate) });
    }, 25);
    const parts: Blob[] = [];
    const recorder = typeof MediaRecorder === "undefined" ? null : new MediaRecorder(stream);
    if (recorder) {
      recorder.ondataavailable = (e) => parts.push(e.data);
      recorder.start();
    }
    return {
      stop: () =>
        new Promise((resolve) => {
          window.clearInterval(timer);
          const end = () => {
            for (const track of stream.getTracks()) track.stop();
            void context.close();
            resolve({
              frames,
              url: parts.length
                ? URL.createObjectURL(new Blob(parts, { type: parts[0]?.type }))
                : null,
            });
          };
          if (!recorder || recorder.state === "inactive") return end();
          recorder.onstop = end;
          recorder.stop();
        }),
    };
  } catch {
    return null; // no microphone, or not allowed: the words are still checked
  }
}
