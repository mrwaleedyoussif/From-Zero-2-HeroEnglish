/**
 * The opening music: the Owner's chosen track (public/brand/intro.mp3, about twelve seconds).
 * Browsers only allow sound after a tap or key press, so this is called from the Start button.
 * One player is kept, so a replay restarts the same music instead of layering it.
 */
let player: HTMLAudioElement | null = null;

export function playWelcome(): void {
  try {
    player ??= new Audio("/brand/intro.mp3");
    player.volume = 0.6;
    player.currentTime = 0;
    void player.play().catch(() => {
      // blocked or not loaded: the page works without sound
    });
  } catch {
    // no audio support
  }
}

export function stopWelcome(): void {
  player?.pause();
}
