// Audio del juego con Web Audio API — cero archivos, cero licencias. v2: voces
// más ricas (capas + reverb) y música de fondo sintetizada. El AudioContext se
// crea/reanuda con el primer gesto (tocar "Jugar"), así el navegador no lo bloquea.

let ctx: AudioContext | null = null;
let muted = false;
let reverb: ConvolverNode | null = null;
let wet: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // reverb (impulse de ruido decayente) para dar "espacio" a los efectos
    const len = Math.floor(ctx.sampleRate * 1.1);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = buf;
    wet = ctx.createGain();
    wet.gain.value = 0.22;
    reverb.connect(wet).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function initAudio() { getCtx(); }
export function setMuted(m: boolean) {
  muted = m;
  if (m) stopMusic(); else if (musicWanted) startMusic();
}
export function isMuted() { return muted; }

type ToneOpts = {
  freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number;
  slideTo?: number; rev?: number; // rev = cuánto va al reverb (0..1)
};

function voice({ freq, dur, type = "sine", gain = 0.18, delay = 0, slideTo, rev = 0.6 }: ToneOpts) {
  const ac = getCtx();
  if (!ac || muted || !reverb) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);          // dry
  const sg = ac.createGain(); sg.gain.value = rev;
  g.connect(sg).connect(reverb);      // wet
  osc.start(t0);
  osc.stop(t0 + dur + 0.08);
}

// Correcto: campanita brillante (dos capas: fundamental + octava) en arpegio.
export function sfxCorrect() {
  [0, 0.06, 0.12].forEach((d, i) => {
    const f = [659.25, 830.61, 987.77][i];
    voice({ freq: f, dur: 0.5, type: "triangle", gain: 0.14, delay: d, rev: 0.8 });
    voice({ freq: f * 2, dur: 0.35, type: "sine", gain: 0.05, delay: d, rev: 0.9 });
  });
}

// Racha: chispa ascendente más larga y brillante.
export function sfxStreak() {
  [523, 659, 784, 1046, 1318].forEach((f, i) =>
    voice({ freq: f, dur: 0.4, type: "triangle", gain: 0.13, delay: i * 0.05, rev: 0.9 }),
  );
}

// Incorrecto: "wah" grave y suave (no chirriante).
export function sfxWrong() {
  voice({ freq: 196, dur: 0.5, type: "sine", gain: 0.16, slideTo: 98, rev: 0.5 });
  voice({ freq: 155, dur: 0.5, type: "triangle", gain: 0.1, slideTo: 78, rev: 0.5 });
}

export function sfxTick() { voice({ freq: 1200, dur: 0.05, type: "sine", gain: 0.06, rev: 0.2 }); }
export function sfxSelect() { voice({ freq: 520, dur: 0.08, type: "sine", gain: 0.1, rev: 0.3 }); }

export function sfxWin() {
  [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
    voice({ freq: f, dur: 0.5, type: "triangle", gain: 0.15, delay: i * 0.1, rev: 0.9 }),
  );
}
export function sfxGameOver() {
  [440, 392, 330, 262, 196].forEach((f, i) =>
    voice({ freq: f, dur: 0.55, type: "sine", gain: 0.14, delay: i * 0.16, rev: 0.7 }),
  );
}

// ---------------------------------------------------------------------------
// Música de fondo — arpegio + bajo, loop. Sintetizada (interim; se puede
// reemplazar por un track real royalty-free en /public/sounds más adelante).
// ---------------------------------------------------------------------------
let musicWanted = false;
let schedTimer: ReturnType<typeof setInterval> | null = null;
let nextNote = 0;
let step = 0;
let bassGain: GainNode | null = null;

// Progresión i–VI–III–VII en La menor (vibe "quiz" enérgico pero no invasivo).
const CHORDS = [
  [220, 261.63, 329.63], // Am
  [174.61, 220, 261.63], // F
  [261.63, 329.63, 392], // C
  [196, 246.94, 293.66], // G
];
const TEMPO = 0.26; // seg por corchea

function musicNote(freq: number, t: number, gain: number, type: OscillatorType = "triangle") {
  const ac = ctx!;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + TEMPO * 1.6);
  o.connect(g);
  g.connect(bassGain!);
  o.start(t);
  o.stop(t + TEMPO * 1.8);
}

function scheduler() {
  const ac = ctx;
  if (!ac) return;
  while (nextNote < ac.currentTime + 0.12) {
    const chord = CHORDS[Math.floor(step / 4) % CHORDS.length];
    const arp = chord[step % 3];
    musicNote(arp * 2, nextNote, 0.035, "triangle"); // arpegio agudo
    if (step % 4 === 0) musicNote(chord[0] / 2, nextNote, 0.05, "sine"); // bajo por compás
    step++;
    nextNote += TEMPO;
  }
}

export function startMusic() {
  musicWanted = true;
  const ac = getCtx();
  if (!ac || muted || schedTimer) return;
  if (!bassGain) { bassGain = ac.createGain(); bassGain.gain.value = 0.9; bassGain.connect(ac.destination); }
  nextNote = ac.currentTime + 0.1;
  schedTimer = setInterval(scheduler, 30);
}

export function stopMusic() {
  if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
}

export function setMusicWanted(w: boolean) { musicWanted = w; if (!w) stopMusic(); }
