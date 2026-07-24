// Efectos de sonido del juego, sintetizados por código con Web Audio API — cero
// archivos, cero licencias. Suena "arcade". El AudioContext se crea/reanuda con
// el primer gesto del usuario (tocar "Jugar"), así los navegadores no lo bloquean.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function initAudio() { getCtx(); }
export function setMuted(m: boolean) { muted = m; }
export function isMuted() { return muted; }

type ToneOpts = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number; // frecuencia final (glide)
};

function tone({ freq, dur, type = "sine", gain = 0.18, delay = 0, slideTo }: ToneOpts) {
  const ac = getCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  // envolvente ADSR simple para que no "clickee"
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Acorde/arpegio ascendente (correcto): triada mayor rápida.
export function sfxCorrect() {
  tone({ freq: 523.25, dur: 0.12, type: "triangle", gain: 0.16 });          // C5
  tone({ freq: 659.25, dur: 0.12, type: "triangle", gain: 0.16, delay: 0.07 }); // E5
  tone({ freq: 783.99, dur: 0.18, type: "triangle", gain: 0.18, delay: 0.14 }); // G5
}

// Descenso disonante (incorrecto).
export function sfxWrong() {
  tone({ freq: 220, dur: 0.28, type: "sawtooth", gain: 0.14, slideTo: 110 });
  tone({ freq: 233, dur: 0.28, type: "square", gain: 0.06, slideTo: 116 });
}

// Tic del reloj en los últimos segundos.
export function sfxTick() {
  tone({ freq: 880, dur: 0.05, type: "square", gain: 0.08 });
}

// Fanfarria corta al subir la racha.
export function sfxStreak() {
  tone({ freq: 659.25, dur: 0.1, type: "square", gain: 0.14 });
  tone({ freq: 987.77, dur: 0.14, type: "square", gain: 0.16, delay: 0.08 });
}

// Melodía de victoria (fin de partida bueno / récord).
export function sfxWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.18, delay: i * 0.12 }));
}

// Sonido grave de game over.
export function sfxGameOver() {
  const notes = [392, 349.23, 293.66, 196];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.3, type: "sawtooth", gain: 0.14, delay: i * 0.16 }));
}

// Click suave de selección.
export function sfxSelect() {
  tone({ freq: 440, dur: 0.06, type: "sine", gain: 0.1 });
}
