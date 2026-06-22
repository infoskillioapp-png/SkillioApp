"use client";

type Stats = { notes: number; subjects: number; aiGenerations: number; racha: number };

type Achievement = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  color: string;
  req: number;
  val: number;
  type: "notes" | "subjects" | "ai" | "racha";
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "primer-apunte", emoji: "📄", name: "Primer apunte", desc: "Subiste tu primer apunte. ¡El camino empieza acá!", color: "#4f7dff", req: 1, val: 0, type: "notes" },
  { id: "estudioso", emoji: "📚", name: "Estudioso", desc: "Subiste 5 apuntes al sistema.", color: "#8b5cf6", req: 5, val: 0, type: "notes" },
  { id: "biblioteca", emoji: "🏛️", name: "Biblioteca", desc: "Tenés 15 apuntes cargados.", color: "#2dd4bf", req: 15, val: 0, type: "notes" },
  { id: "materias", emoji: "📁", name: "Organizado", desc: "Creaste tu primera materia.", color: "#f59e0b", req: 1, val: 0, type: "subjects" },
  { id: "multimateria", emoji: "🗂️", name: "Multi-materia", desc: "Tenés 5 materias creadas.", color: "#ff6b81", req: 5, val: 0, type: "subjects" },
  { id: "primer-ia", emoji: "🤖", name: "Booki activado", desc: "Generaste tu primer resumen con IA.", color: "#10b981", req: 1, val: 0, type: "ai" },
  { id: "power-user", emoji: "⚡", name: "Power user", desc: "Generaste 10 sets de estudio.", color: "#6d3bf2", req: 10, val: 0, type: "ai" },
  { id: "maestro", emoji: "🎓", name: "Maestro", desc: "Generaste 30 sets de estudio.", color: "#c1338f", req: 30, val: 0, type: "ai" },
  { id: "racha-3", emoji: "🔥", name: "3 días de racha", desc: "Estudiaste 3 días seguidos.", color: "#ff8a5c", req: 3, val: 0, type: "racha" },
  { id: "racha-7", emoji: "🌟", name: "Semana perfecta", desc: "7 días consecutivos estudiando.", color: "#ffc93c", req: 7, val: 0, type: "racha" },
];

const DAYS_ES = ["D", "L", "M", "X", "J", "V", "S"];

export function LogrosClient({ stats, userName }: { stats: Stats; userName: string }) {
  const filled = ACHIEVEMENTS.map((a) => {
    const val = a.type === "notes" ? stats.notes
      : a.type === "subjects" ? stats.subjects
      : a.type === "ai" ? stats.aiGenerations
      : stats.racha;
    const done = val >= a.req;
    const pct = Math.min(Math.round((val / a.req) * 100), 100);
    return { ...a, val, done, pct };
  });

  const done = filled.filter((a) => a.done).length;
  const today = new Date().getDay();

  return (
    <div className="logros-wrap">
      {/* racha hero */}
      <div className="racha-hero in">
        <div>
          <div className="rnum">{stats.racha}</div>
          <div style={{ fontSize: 24 }}>🔥</div>
        </div>
        <div className="rtx">
          <h2>días de racha</h2>
          <p>{stats.racha === 0 ? "Estudiá hoy para empezar tu racha." : `¡Seguí así, ${userName.split(" ")[0]}! No rompas la racha.`}</p>
          <div className="racha-days">
            {DAYS_ES.map((d, i) => (
              <div key={d} className={`rday${i === today ? " done" : ""}`}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      {/* stats top */}
      <div className="logros-stats in">
        <div className="lstat">
          <div className="lsi" style={{ background: "linear-gradient(135deg,#4f7dff,#8b5cf6)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
            </svg>
          </div>
          <b>{stats.notes}</b>
          <span>apuntes subidos</span>
        </div>
        <div className="lstat">
          <div className="lsi" style={{ background: "linear-gradient(135deg,#ff5d79,#e4264f)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <b>{stats.subjects}</b>
          <span>materias creadas</span>
        </div>
        <div className="lstat">
          <div className="lsi" style={{ background: "linear-gradient(135deg,#34d399,#10b981)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 2 2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 13.9 2 9.3h7.6z" />
            </svg>
          </div>
          <b>{done}/{ACHIEVEMENTS.length}</b>
          <span>logros desbloqueados</span>
        </div>
        <div className="lstat">
          <div className="lsi" style={{ background: "linear-gradient(135deg,#ffc93c,#ffb020)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <b>{stats.aiGenerations}</b>
          <span>sets de IA generados</span>
        </div>
      </div>

      {/* grid de logros */}
      <h2 className="po" style={{ fontSize: 18, fontWeight: 700, margin: "8px 0 16px" }}>
        Tus logros · {done} de {ACHIEVEMENTS.length}
      </h2>
      <div className="logros-grid">
        {filled.map((a, i) => (
          <div key={a.id} className={`logro in${a.done ? "" : " locked"}`} style={{ animationDelay: `${i * 0.05}s` }}>
            {a.done && <span className="lbadge">✓ Desbloqueado</span>}
            <div className="li" style={{ background: a.done ? `${a.color}22` : "#f3f4fb" }}>
              <span style={{ fontSize: 32 }}>{a.emoji}</span>
            </div>
            <div className="lnm">{a.name}</div>
            <div className="ldesc">{a.desc}</div>
            {!a.done && (
              <>
                <div className="lprog"><i style={{ width: a.pct + "%", background: a.color }} /></div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>{a.val}/{a.req}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
