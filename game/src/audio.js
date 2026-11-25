// All sound is synthesized with WebAudio: no audio files, no network. The context is
// created on the first user gesture (browsers block sound before one), every call is
// guarded, and M or the mute button silences it all.
export function createAudio() {
  let context = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + seconds + 0.02);
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }

  function noise(seconds, volume, filterFreq) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
    } catch {
      // Sound is garnish.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    chop() {
      noise(0.09, 0.5, 1800);
    },
    place() {
      tone(520, 0.08, 'sine', 0.25);
    },
    pickup() {
      tone(660, 0.07, 'sine', 0.2);
    },
    cookDone() {
      tone(880, 0.12, 'sine', 0.25);
      tone(1174, 0.16, 'sine', 0.22, 0.1);
    },
    serve() {
      tone(523, 0.12, 'triangle', 0.3);
      tone(659, 0.12, 'triangle', 0.3, 0.1);
      tone(784, 0.22, 'triangle', 0.3, 0.2);
    },
    refused() {
      tone(160, 0.18, 'square', 0.15);
    },
    expired() {
      tone(220, 0.3, 'sawtooth', 0.12);
      tone(185, 0.35, 'sawtooth', 0.12, 0.15);
    },
    over() {
      tone(523, 0.2, 'triangle', 0.25);
      tone(659, 0.2, 'triangle', 0.25, 0.18);
      tone(784, 0.35, 'triangle', 0.25, 0.36);
    },
    /** A soft pan sizzle while any burner cooks; silent otherwise. */
    updateSizzle(cooking) {
      const ctx = ensure();
      if (!ctx || muted) return;
      try {
        if (cooking && !sizzle) {
          const length = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 4000;
          const gain = ctx.createGain();
          gain.gain.value = 0.035;
          source.connect(filter).connect(gain).connect(ctx.destination);
          source.start();
          sizzle = { source, gain };
        } else if (!cooking && sizzle) {
          sizzle.source.stop();
          sizzle = null;
        }
      } catch {
        sizzle = null;
      }
    },
  };
}
