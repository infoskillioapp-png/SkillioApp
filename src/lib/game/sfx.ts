// Audio del juego con Web Audio API + buffers. Los archivos reales (CC0) se
// descargan y DECODIFICAN UNA sola vez (al tocar "Jugar") y se reproducen con
// AudioBufferSourceNode — fuera del hilo principal, sin trabar las animaciones.
// (HTMLAudio reproduce en el main thread y causaba lag; por eso este cambio.)

let ctx: AudioContext | null = null;
let muted = false;
let loaded = false;

const FILES: Record<string, string> = {
  correct: "/efectos de sonido/respuesta correcta.wav",
  wrong: "/efectos de sonido/respuesta incorrecta.wav",
  points: "/efectos de sonido/cuando suma puntos.wav",
  win: "/efectos de sonido/mixkit-game-level-completed-2059.wav",
  music: "/efectos de sonido/musica de fondo juego.mp3",
};
const buffers: Record<string, AudioBuffer> = {};

let musicSrc: AudioBufferSourceNode | null = null;
let musicGain: GainNode | null = null;
let musicWanted = false;

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

// iOS/Safari: el AudioContext arranca bloqueado y SOLO se desbloquea si se
// reproduce algo sincrónicamente dentro de un gesto del usuario. Reproducir un
// buffer silencioso de 1 sample alcanza. Sin esto, en mobile no sonaba nada.
function unlock(ac: AudioContext) {
  try {
    const b = ac.createBuffer(1, 1, 22050);
    const s = ac.createBufferSource();
    s.buffer = b;
    s.connect(ac.destination);
    s.start(0);
  } catch { /* noop */ }
}

// Se llama dentro del gesto del usuario (tocar "Jugar"): resume + desbloquea el
// contexto (iOS) y descarga + decodifica los sonidos una sola vez. Al terminar
// de decodificar, si se pidió música, arranca.
export function initAudio() {
  const ac = getCtx(); // crea + resume
  if (!ac) return;
  unlock(ac); // desbloqueo iOS, sincrónico dentro del gesto
  if (loaded) return;
  loaded = true;
  Object.entries(FILES).forEach(async ([k, url]) => {
    try {
      const res = await fetch(encodeURI(url));
      buffers[k] = await ac.decodeAudioData(await res.arrayBuffer());
      if (k === "music" && musicWanted && !muted) startMusic();
    } catch { /* si un archivo falla, el resto sigue */ }
  });
}

function playBuf(key: string, gain: number) {
  const ac = getCtx();
  if (!ac || muted || !buffers[key]) return;
  const src = ac.createBufferSource();
  src.buffer = buffers[key];
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ac.destination);
  src.start();
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) stopMusic();
  else if (musicWanted) startMusic();
}
export function isMuted() { return muted; }

export const sfxCorrect = () => playBuf("correct", 0.85);
export const sfxWrong = () => playBuf("wrong", 0.8);
export const sfxStreak = () => playBuf("points", 0.8);
export const sfxWin = () => playBuf("win", 0.7);
export const sfxSelect = () => { /* el tap ya lo cubre correcto/incorrecto */ };

// ---- música de fondo (buffer en loop) ----
export function startMusic() {
  musicWanted = true;
  const ac = getCtx();
  if (!ac || muted || !buffers.music || musicSrc) return;
  musicGain = ac.createGain();
  musicGain.gain.value = 0.28;
  musicSrc = ac.createBufferSource();
  musicSrc.buffer = buffers.music;
  musicSrc.loop = true;
  musicSrc.connect(musicGain).connect(ac.destination);
  musicSrc.start();
}
export function stopMusic() {
  if (musicSrc) {
    try { musicSrc.stop(); } catch { /* noop */ }
    musicSrc.disconnect();
    musicSrc = null;
  }
}
export function setMusicWanted(w: boolean) { musicWanted = w; if (!w) stopMusic(); }

// ---- beeps sintetizados para lo que no tiene archivo (tick, game over) ----
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
