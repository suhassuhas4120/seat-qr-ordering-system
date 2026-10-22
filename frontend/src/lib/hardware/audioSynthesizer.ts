// ==============================================================================
// THOOGUDEEPA V2: PURE REUSABLE TWO-TONE CHIME SYNTHESIZER SINGLETON
// Eliminates AudioContext hardware limit crashes and asset download latency
// ==============================================================================

let masterContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!masterContext) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        masterContext = new AudioCtx();
      }
    } catch (err) {
      console.warn('Web Audio API not supported on this device:', err);
    }
  }

  // Resume context if browser autoplay policy suspended it
  if (masterContext && masterContext.state === 'suspended') {
    masterContext.resume().catch(() => {});
  }

  return masterContext;
}

export function playKitchenChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Two-tone pleasant acoustic chime (D5: 587.33Hz -> A5: 880.00Hz)
    osc.type = 'sine';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);

    // Auto cleanup nodes after playing
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    };
  } catch (err) {
    console.warn('Acoustic chime playback notice:', err);
  }
}
