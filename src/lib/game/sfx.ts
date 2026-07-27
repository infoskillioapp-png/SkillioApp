// Audio del juego con HTMLAudio (archivos reales CC0 en /public/efectos de sonido/).
// Se usa HTMLAudio y NO Web Audio a propósito: en iPhone/Safari, Web Audio queda
// mudo (lo silencia hasta el interruptor físico) y era imposible que sonara en
// mobile. HTMLAudio reproduce por el pipeline de media del navegador y sí suena.
// El lag que veíamos NO era el audio: era la barra del timer animando `width`
// (ya resuelto con transform:scaleX en el juego), así que HTMLAudio no traba.

let muted = false;

const FILES: Record<string, string> = {
  correct: "/efectos de sonido/respuesta correcta.wav",
  wrong: "/efectos de sonido/respuesta incorrecta.wav",
  points: "/efectos de sonido/cuando suma puntos.wav",
  win: "/efectos de sonido/mixkit-game-level-completed-2059.wav",
};
const VOL: Record<string, number> = { correct: 0.8, wrong: 0.75, points: 0.75, win: 0.7 };

const els: Record<string, HTMLAudioElement> = {};
let music: HTMLAudioElement | null = null;
let musicWanted = false;

function el(key: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!els[key]) {
    const a = new Audio(encodeURI(FILES[key]));
    a.preload = "auto";
    a.volume = VOL[key] ?? 0.75;
    els[key] = a;
  }
  return els[key];
}

function play(key: string) {
  if (muted) return;
  const a = el(key);
  if (!a) return;
  try { a.currentTime = 0; void a.play(); } catch { /* noop */ }
}

function musicEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!music) {
    music = new Audio(encodeURI("/efectos de sonido/musica de fondo juego.mp3"));
    music.loop = true;
    music.volume = 0.3;
  }
  return music;
}

// Se llama dentro del gesto del usuario (tocar "Jugar"): "desbloquea" cada audio
// reproduciéndolo y pausándolo, así iOS/Safari deja reproducirlos después por
// código (ej: el sonido de error cuando se acaba el tiempo).
export function initAudio() {
  Object.keys(FILES).forEach((k) => {
    const a = el(k);
    if (a) a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });
  // también prepara la música (se reproduce con startMusic dentro del gesto)
  musicEl();
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) stopMusic();
  else if (musicWanted) startMusic();
}
export function isMuted() { return muted; }

export const sfxCorrect = () => play("correct");
export const sfxWrong = () => play("wrong");
export const sfxStreak = () => play("points");
export const sfxWin = () => play("win");
export const sfxSelect = () => { /* el tap ya lo cubre correcto/incorrecto */ };

// ---- música de fondo ----
export function startMusic() {
  musicWanted = true;
  if (muted) return;
  const m = musicEl();
  if (m) m.play().catch(() => {});
}
export function stopMusic() { if (music) music.pause(); }
export function setMusicWanted(w: boolean) { musicWanted = w; if (!w) stopMusic(); }

// ---- beeps para lo que no tiene archivo (tick del reloj, game over) ----
let ctx: AudioContext | null = null;
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
function beep(freq: number, dur: number, gain = 0.1, type: OscillatorType = "sine", delay = 0, slideTo?: number) {
  const ac = getCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function sfxTick() { beep(1150, 0.05, 0.05, "sine"); }
export function sfxGameOver() {
  [392, 330, 262, 196].forEach((f, i) => beep(f, 0.4, 0.12, "sine", i * 0.16, f * 0.85));
}
