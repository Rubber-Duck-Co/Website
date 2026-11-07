// Small synthesized noises: brass tinks and the duck's squeak. No audio files.

const STORAGE_KEY = "rdc-sound";

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The toggle still works for this page.
  }
}

export function createSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let enabled = readEnabled();
  let lastTink = 0;

  // Audio can only start after a click or tap, which is always how these get called.
  function ready() {
    if (!enabled || !AudioContextClass) {
      return null;
    }
    if (!context) {
      context = new AudioContextClass();
    }
    if (context.state === "suspended") {
      context.resume();
    }
    return context;
  }

  // A brass case hitting something: a few inharmonic partials with a fast decay.
  function tink(strength) {
    const ctx = ready();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    const volume = Math.min(1, strength) * 0.1;
    if (volume < 0.008 || now - lastTink < 0.035) {
      return;
    }
    lastTink = now;

    const out = ctx.createGain();
    out.gain.setValueAtTime(volume, now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 + strength * 0.08);
    out.connect(ctx.destination);

    const base = 2300 + Math.random() * 1900;
    for (const [ratio, level] of [[1, 1], [2.76, 0.45], [5.4, 0.2]]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = base * ratio;
      gain.gain.value = level;
      oscillator.connect(gain).connect(out);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    }
  }

  // A rubber duck being squeezed: a warbling, nasal squeal that rises then drops.
  function squeak() {
    const ctx = ready();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const wobble = ctx.createOscillator();
    const wobbleDepth = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(950, now);
    oscillator.frequency.exponentialRampToValueAtTime(1600, now + 0.07);
    oscillator.frequency.exponentialRampToValueAtTime(780, now + 0.3);

    wobble.frequency.value = 28;
    wobbleDepth.gain.value = 70;
    wobble.connect(wobbleDepth).connect(oscillator.frequency);

    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 1.8;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    oscillator.connect(filter).connect(gain).connect(ctx.destination);
    oscillator.start(now);
    wobble.start(now);
    oscillator.stop(now + 0.34);
    wobble.stop(now + 0.34);
  }

  return {
    tink,
    squeak,
    get enabled() {
      return enabled;
    },
    setEnabled(value) {
      enabled = value;
      writeEnabled(value);
    },
  };
}
