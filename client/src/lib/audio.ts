let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const extendedWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };

  const Constructor = window.AudioContext ?? extendedWindow.webkitAudioContext;
  if (!Constructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new Constructor();
  }

  return audioContext;
}

export function playCorrectGuessSound(): void {
  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      void context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.35);
  } catch (error) {
    console.error("Failed to play correct guess sound", error);
  }
}
