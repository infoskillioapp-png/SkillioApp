/**
 * Sistema de niveles. Curva cuadratica suave: cada nivel cuesta
 * un poco mas que el anterior pero accesible para usuarios casuales.
 *
 *   xp para llegar al nivel N (acumulado desde 0) = 200 * N * (N - 1) / 2
 *
 *   nivel 1 -> 0 XP
 *   nivel 2 -> 200 XP
 *   nivel 3 -> 600 XP
 *   nivel 4 -> 1200 XP
 *   nivel 5 -> 2000 XP
 *   nivel 6 -> 3000 XP
 *   nivel 7 -> 4200 XP
 *   nivel 8 -> 5600 XP
 */

const NAMES = [
  "Novato",
  "Curioso",
  "Aplicado",
  "Constante",
  "Dedicado",
  "Enfocado",
  "Explorador",
  "Sabio",
  "Experto",
  "Maestro",
  "Leyenda",
  "Elite",
];

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 200 * level * (level - 1) * 0.5;
}

export function levelForXp(xp: number): number {
  let lvl = 1;
  while (xpRequiredForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

export function levelName(level: number): string {
  return NAMES[Math.min(level, NAMES.length) - 1] ?? "Elite";
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const base = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const ratio = next === base ? 1 : (xp - base) / (next - base);
  return {
    level,
    name: levelName(level),
    nextName: levelName(level + 1),
    xpInLevel: xp - base,
    xpToNext: Math.max(0, next - xp),
    xpForNextLevel: next - base,
    ratio: Math.max(0, Math.min(1, ratio)),
  };
}
