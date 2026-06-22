import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSkillioUser } from "@/lib/db";
import { listSubjects } from "@/lib/api/subjects";
import { listAiOutputs } from "@/lib/api/ai-outputs";
import type { Subject } from "@/lib/types";
import type { AiOutputRow } from "@/lib/api/ai-outputs";

// ── Hero ─────────────────────────────────────────────────────────────
function DashboardHero({ firstName }: { firstName: string }) {
  return (
    <section
      style={{
        position: "relative", overflow: "hidden", borderRadius: 28,
        padding: "30px 32px", color: "#fff", display: "flex", alignItems: "center",
        background: "linear-gradient(125deg,#6d3bf2 0%,#9326cf 52%,#c1338f 100%)",
        boxShadow: "0 22px 46px rgba(124,58,242,.34)", minHeight: 240,
      }}
    >
      <div aria-hidden style={{ position:"absolute", top:-90, right:90, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,.22),transparent 65%)", pointerEvents:"none" }} />
      <div aria-hidden style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0) 40%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:2, maxWidth:340 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", opacity:.85, marginBottom:10 }}>
          Hola, {firstName} 👋
        </div>
        <h1 style={{ fontFamily:"var(--v3-po)", fontWeight:800, fontSize:"clamp(24px,3vw,32px)", lineHeight:1.12, marginBottom:10 }}>
          Subí tu apunte y<br />estudiá en minutos
        </h1>
        <p style={{ fontSize:14, opacity:.92, lineHeight:1.5, marginBottom:22 }}>
          Booki te arma el resumen, las tarjetas y el simulacro. Vos solo concentrate en aprender. 🚀
        </p>
        <Link href="/app/ia" className="v3-upload-btn" style={{
          display:"inline-flex", alignItems:"center", gap:10,
          background:"#fff", color:"#6d28d9",
          fontFamily:"var(--v3-po)", fontWeight:700, fontSize:15,
          padding:"14px 24px", borderRadius:16,
          boxShadow:"0 12px 24px rgba(0,0,0,.18)", textDecoration:"none",
        }}>
          <span style={{ width:30, height:30, borderRadius:10, background:"linear-gradient(135deg,#4f7dff,#8b5cf6)", display:"grid", placeItems:"center", color:"#fff", flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </span>
          Subir archivo
        </Link>
      </div>

      {/* Booki illustration */}
      <div aria-hidden style={{ position:"absolute", right:0, top:0, bottom:0, width:320, zIndex:1, pointerEvents:"none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/booki_home.png" alt="" style={{
          width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 14%",
          WebkitMaskImage:"radial-gradient(72% 78% at 62% 40%, #000 48%, transparent 76%)",
          maskImage:"radial-gradient(72% 78% at 62% 40%, #000 48%, transparent 76%)",
        }} />
      </div>
    </section>
  );
}

// ── Continuar ─────────────────────────────────────────────────────────
const KIND_LABEL: Record<string, string> = { summary:"Resumen", flashcards:"Flashcards", simulacro:"Simulacro" };
const KIND_ICON: Record<string, string>  = { summary:"📄", flashcards:"🃏", simulacro:"📝" };

function DashboardContinuar({ lastOutput }: { lastOutput: AiOutputRow | null }) {
  return (
    <div style={{
      background:"linear-gradient(155deg,#5b8cff 0%,#3f63ff 100%)", color:"#fff",
      borderRadius:28, boxShadow:"0 12px 32px rgba(63,99,255,.40)",
      padding:"22px 22px 20px", display:"flex", flexDirection:"column",
      position:"relative", overflow:"hidden",
    }}>
      <div aria-hidden style={{ position:"absolute", width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.13)", top:-60, right:-30, pointerEvents:"none" }} />
      <div aria-hidden style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 46%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:1, flex:1 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:".07em", textTransform:"uppercase", color:"rgba(255,255,255,.9)", display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Continuá donde quedaste
        </div>

        {lastOutput ? (
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <span style={{ fontSize:28 }}>{KIND_ICON[lastOutput.kind] ?? "📄"}</span>
            <div>
              <div style={{ fontFamily:"var(--v3-po)", fontWeight:700, fontSize:16, color:"#fff" }}>
                {lastOutput.title ?? "(sin título)"}
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.78)", marginTop:2 }}>
                {KIND_LABEL[lastOutput.kind]} · {new Date(lastOutput.created_at).toLocaleDateString("es-AR", { day:"numeric", month:"short" })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"var(--v3-po)", fontWeight:700, fontSize:17, color:"#fff", opacity:.9 }}>
              Todavía no generaste nada
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.72)", marginTop:4 }}>
              Subí tu primer apunte y empezá.
            </div>
          </div>
        )}
      </div>

      <Link href="/app/ia" style={{
        position:"relative", zIndex:1,
        display:"flex", alignItems:"center", justifyContent:"center", gap:9,
        padding:13, borderRadius:15,
        color:"#3f63ff", fontFamily:"var(--v3-po)", fontWeight:700, fontSize:14.5,
        background:"#fff", boxShadow:"0 8px 20px rgba(0,0,0,.15)", textDecoration:"none",
      }}>
        {lastOutput ? "Retomar estudio" : "Ir al Espacio de Estudio"}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </Link>
    </div>
  );
}

// ── Materias ──────────────────────────────────────────────────────────
const COLORS: [string, string][] = [
  ["#5b8cff","#3f63ff"], ["#9a63f7","#7c3aed"],
  ["#ff6b81","#e4264f"], ["#34d399","#10b981"], ["#fbbf24","#f59e0b"],
];
const ICONS = ["❤️","🧬","🧪","💊","📚","⭐","🎯","🔬"];

function DashboardMaterias({ subjects }: { subjects: Subject[] }) {
  return (
    <section>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", margin:"4px 4px 14px" }}>
        <div>
          <h2 style={{ fontFamily:"var(--v3-po)", fontWeight:800, fontSize:22, color:"var(--v3-ink)" }}>
            Mis materias
          </h2>
          <p style={{ fontSize:13.5, color:"var(--v3-muted)", marginTop:2 }}>
            Tus apuntes ordenados por materia. Tocá una y seguí sumando dominio. 💪
          </p>
        </div>
        <Link href="/app/materias" style={{ fontSize:13, fontWeight:700, color:"var(--v3-violet)", textDecoration:"none" }}>
          Ver todas →
        </Link>
      </div>

      <div style={{ background:"#fff", borderRadius:24, boxShadow:"var(--v3-sh)", padding:"8px 10px", overflow:"hidden" }}>
        {subjects.length === 0 ? (
          <div style={{ textAlign:"center", padding:"52px 24px 44px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bookisubirarchivocorrecto.png" alt="" style={{ width:130, filter:"drop-shadow(0 10px 18px rgba(99,60,220,.22))" }} />
            <h3 style={{ fontFamily:"var(--v3-po)", fontWeight:800, fontSize:20, color:"var(--v3-ink)", marginTop:4 }}>
              Todavía no tenés apuntes
            </h3>
            <p style={{ fontSize:14, color:"var(--v3-muted)", maxWidth:"30ch", lineHeight:1.55 }}>
              Subí el primero y Booki te arma el resumen, las tarjetas y el simulacro.
            </p>
            <Link href="/app/ia" style={{
              display:"inline-flex", alignItems:"center", gap:9,
              padding:"13px 24px", borderRadius:16, color:"#fff",
              fontFamily:"var(--v3-po)", fontWeight:700, fontSize:14.5,
              background:"linear-gradient(135deg,#4f7dff,#8b5cf6)",
              boxShadow:"0 12px 24px rgba(99,102,241,.32)", textDecoration:"none", marginTop:4,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Subir mi primer apunte
            </Link>
          </div>
        ) : subjects.map((s, i) => {
          const [c1, c2] = COLORS[i % COLORS.length];
          return (
            <Link key={s.id} href="/app/materias" className="v3-materia-row"
              style={{ borderBottom: i < subjects.length - 1 ? "1px solid #eef0f6" : "none" }}
            >
              <div style={{ width:48, height:48, borderRadius:14, flexShrink:0, display:"grid", placeItems:"center", color:"#fff", fontSize:22, background:`linear-gradient(135deg,${c1},${c2})`, boxShadow:"0 8px 16px rgba(0,0,0,.13)" }}>
                {ICONS[i % ICONS.length]}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"var(--v3-po)", fontWeight:700, fontSize:16, color:"var(--v3-ink)" }}>{s.name}</div>
                {s.professor && <div style={{ fontSize:12.5, color:"var(--v3-muted)", marginTop:1 }}>{s.professor}</div>}
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--v3-faint)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
            </Link>
          );
        })}
      </div>

      <Link href="/app/materias" className="v3-add-materia">
        <div style={{ width:40, height:40, borderRadius:13, background:"#eef0ff", color:"#8b5cf6", display:"grid", placeItems:"center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        Crear nueva materia
      </Link>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const [subjects, recentOutputs] = await Promise.all([
    listSubjects(),
    listAiOutputs(1),
  ]);

  const firstName = user.full_name?.split(" ")[0] ?? user.email.split("@")[0];
  const lastOutput = recentOutputs[0] ?? null;

  return (
    <div style={{ maxWidth:1180, margin:"0 auto", padding:"0 20px 48px" }}>
      {/* grid hero + continuar */}
      <div style={{ display:"grid", gridTemplateColumns:"1.65fr 1fr", gap:20, marginBottom:26 }}>
        <DashboardHero firstName={firstName} />
        <DashboardContinuar lastOutput={lastOutput} />
      </div>
      {/* materias */}
      <DashboardMaterias subjects={subjects} />
    </div>
  );
}
