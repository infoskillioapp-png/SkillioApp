"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SalePopup } from "@/components/sale-popup";

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
  const canCancel = plan === "pro" || plan === "semanal";
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tourReset, setTourReset] = useState(false);

  function resetTours() {
    const keys = [
      "skillio_home_tour_v1", "skillio_espacio_tour_v1",
      "skillio_resumen_tour_v1", "skillio_tarjetas_tour_v1",
      "skillio_upload_modal_tour_v1",
    ];
    keys.forEach(k => localStorage.removeItem(k));
    setTourReset(true);
    setTimeout(() => setTourReset(false), 2500);
  }

  async function handleCancel() {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      if (res.ok) { setCancelled(true); setConfirmCancel(false); }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
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
        <div className="plan-card in" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", width: "100%", height: 180 }}>
            <Image
              src="/paywalls/upsell-banner.png"
              alt=""
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
          <div style={{ padding: "18px 20px 20px" }}>
            <h3>Actualizá a PRO</h3>
            <p>Accedé a generaciones ilimitadas de resúmenes, tarjetas y simulacros. Estudia más rápido y retené más.</p>
            <button className="upgrade-btn" onClick={() => setShowPaywall(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Ver planes PRO
            </button>
          </div>
        </div>
      )}

      {/* cancelar suscripción */}
      {canCancel && (
        <div className="perfil-section in" style={{ marginBottom: 16 }}>
          <h3>Suscripción</h3>
          {cancelled ? (
            <div style={{ padding: "16px 20px", fontSize: 13.5, color: "#16a34a" }}>
              ✓ Tu suscripción fue cancelada. Seguirás con acceso hasta que venza el período actual.
            </div>
          ) : (
            <div className="perfil-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
              {confirmCancel ? (
                <>
                  <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                    ¿Estás seguro? Perderás acceso PRO al vencer el período actual.
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="praction danger"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? "Cancelando…" : "Sí, cancelar"}
                    </button>
                    <button
                      className="praction"
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelling}
                    >
                      Volver
                    </button>
                  </div>
                </>
              ) : (
                <button className="praction danger" onClick={handleCancel}>
                  Cancelar suscripción
                </button>
              )}
            </div>
          )}
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
            <button className="praction" style={{ background: "linear-gradient(135deg,var(--blue),var(--violet))", color: "#fff" }} onClick={() => setShowPaywall(true)}>
              Actualizar
            </button>
          </div>
        )}
        <div className="perfil-row">
          <span className="prl">Tutoriales</span>
          <button className="praction" onClick={resetTours}>
            {tourReset ? "¡Reiniciado ✓" : "Reiniciar tours"}
          </button>
        </div>
        <div className="perfil-row">
          <span className="prl">Cerrar sesión</span>
          <button className="praction danger" onClick={() => signOut({ redirectUrl: "/" })}>
            Salir
          </button>
        </div>
      </div>
    </div>

    {showPaywall && <SalePopup ctx="generic" onClose={() => setShowPaywall(false)} />}
    </>
  );
}
