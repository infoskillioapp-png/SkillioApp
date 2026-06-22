"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";

type Props = {
  name: string;
  email: string;
  plan: string;
  planLabel: string;
  expiresAt: string | null;
  memberSince: string;
  stats: { notes: number; subjects: number; aiGenerations: number };
};

const PLAN_ICONS: Record<string, string> = {
  free: "🆓",
  semanal: "⚡",
  pro: "🌟",
  free_trial: "⏳",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function PerfilClient({ name, email, plan, planLabel, expiresAt, memberSince, stats }: Props) {
  const { signOut } = useClerk();
  const initial = name.trim().charAt(0).toUpperCase();
  const isPro = plan === "pro" || plan === "semanal" || plan === "free_trial";

  return (
    <div className="perfil-wrap">
      {/* hero */}
      <div className="perfil-hero in">
        <div className="perfil-av">{initial}</div>
        <div>
          <div className="perfil-nm">{name}</div>
          <div className="perfil-email">{email}</div>
          <div className="perfil-plan">
            <span>{PLAN_ICONS[plan] ?? "📌"}</span>
            {planLabel}
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="perfil-stats in">
        <div className="pstat">
          <b>{stats.notes}</b>
          <span>apuntes</span>
        </div>
        <div className="pstat">
          <b>{stats.subjects}</b>
          <span>materias</span>
        </div>
        <div className="pstat">
          <b>{stats.aiGenerations}</b>
          <span>sets IA</span>
        </div>
      </div>

      {/* plan card */}
      {isPro ? (
        <div className="perfil-section in" style={{ marginBottom: 16 }}>
          <h3>Tu plan</h3>
          <div className="perfil-row">
            <span className="prl">Plan actual</span>
            <span className="prv">{planLabel}</span>
          </div>
          {expiresAt && (
            <div className="perfil-row">
              <span className="prl">Vence el</span>
              <span className="prv">{formatDate(expiresAt)}</span>
            </div>
          )}
          <div className="perfil-row">
            <span className="prl">Miembro desde</span>
            <span className="prv">{formatDate(memberSince)}</span>
          </div>
        </div>
      ) : (
        <div className="plan-card in">
          <h3>Actualizá a PRO</h3>
          <p>Accedé a generaciones ilimitadas de resúmenes, tarjetas y simulacros. Estudia más rápido y retené más.</p>
          <Link href="/pagar" className="upgrade-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Ver planes PRO
          </Link>
        </div>
      )}

      {/* detalles cuenta */}
      <div className="perfil-section in">
        <h3>Cuenta</h3>
        <div className="perfil-row">
          <span className="prl">Nombre</span>
          <span className="prv">{name}</span>
        </div>
        <div className="perfil-row">
          <span className="prl">Email</span>
          <span className="prv">{email}</span>
        </div>
        <div className="perfil-row">
          <span className="prl">Miembro desde</span>
          <span className="prv">{formatDate(memberSince)}</span>
        </div>
      </div>

      {/* acciones */}
      <div className="perfil-section in">
        <h3>Acciones</h3>
        <div className="perfil-row">
          <span className="prl">Mis apuntes</span>
          <Link href="/app/materias" className="praction">Ver materias</Link>
        </div>
        <div className="perfil-row">
          <span className="prl">Logros</span>
          <Link href="/app/logros" className="praction">Ver logros</Link>
        </div>
        {!isPro && (
          <div className="perfil-row">
            <span className="prl">Plan PRO</span>
            <Link href="/pagar" className="praction" style={{ background: "linear-gradient(135deg,var(--blue),var(--violet))", color: "#fff" }}>
              Actualizar
            </Link>
          </div>
        )}
        <div className="perfil-row">
          <span className="prl">Cerrar sesión</span>
          <button className="praction danger" onClick={() => signOut({ redirectUrl: "/" })}>
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
