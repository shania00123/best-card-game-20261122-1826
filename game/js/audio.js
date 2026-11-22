// Ember Court — tiny synthesized sounds. No audio files: every blip is an
// oscillator through the Web Audio API, created on the first user gesture.

let ctx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, when = 0) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, ac.currentTime + when);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + when + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + dur + 0.05);
}

export const sfx = {
  play() { tone(520, 0.12, 'triangle', 0.12); tone(780, 0.14, 'triangle', 0.1, 0.06); },
  attack() { tone(180, 0.16, 'sawtooth', 0.1); tone(90, 0.2, 'square', 0.08, 0.02); },
  hit() { tone(140, 0.1, 'square', 0.09); },
  turn() { tone(660, 0.1, 'sine', 0.1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, i * 0.14)); },
  error() { tone(110, 0.12, 'square', 0.08); },
};
