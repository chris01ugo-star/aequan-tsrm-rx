type Listener = () => void;

let enabled = true;
const listeners = new Set<Listener>();
let context: AudioContext | null = null;

function audioContext() {
  if (!context) {
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    context = new Ctx();
  }
  return context;
}

export function isRxAudioEnabled() {
  return enabled;
}

export function setRxAudioEnabled(next: boolean) {
  enabled = next;
  listeners.forEach((listener) => listener());
}

export function subscribeRxAudio(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Spin-up del rotore (~300 ms) e beep di erogazione. Nessun file esterno. */
export function playExposureCue() {
  if (!enabled || typeof window === "undefined") return;
  const ctx = audioContext();
  void ctx.resume();
  const now = ctx.currentTime;
  const rotor = ctx.createOscillator();
  const rotorGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, now);
  filter.frequency.exponentialRampToValueAtTime(520, now + 0.3);
  rotor.type = "sawtooth";
  rotor.frequency.setValueAtTime(72, now);
  rotor.frequency.exponentialRampToValueAtTime(168, now + 0.3);
  rotorGain.gain.setValueAtTime(0.0001, now);
  rotorGain.gain.exponentialRampToValueAtTime(0.04, now + 0.07);
  rotorGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  rotor.connect(filter);
  filter.connect(rotorGain);
  rotorGain.connect(ctx.destination);
  rotor.start(now);
  rotor.stop(now + 0.34);

  const beep = ctx.createOscillator();
  const beepGain = ctx.createGain();
  beep.type = "sine";
  beep.frequency.value = 988;
  beepGain.gain.setValueAtTime(0.0001, now + 0.3);
  beepGain.gain.exponentialRampToValueAtTime(0.07, now + 0.325);
  beepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
  beep.connect(beepGain);
  beepGain.connect(ctx.destination);
  beep.start(now + 0.3);
  beep.stop(now + 0.5);
}
