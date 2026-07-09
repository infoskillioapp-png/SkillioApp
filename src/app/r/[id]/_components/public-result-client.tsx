"use client";

import { useState } from "react";
import Link from "next/link";
import { SalePopup } from "@/components/sale-popup";

export type ResultPoint = {
  emoji?: string;
  title: string;
  description: string;
  category?: string;
};

const FREE_LIMIT = 3;

type Props =
  | { notFound: true }
  | {
      notFound?: false;
      outputId: string;
      title: string;
      intro: string | null;
      points: ResultPoint[];
      isPaid: boolean;
    };

export function PublicResultClient(props: Props) {
  if ("notFound" in props && props.notFound) {
    return <NotAvailable />;
  }
  return <Result {...(props as Extract<Props, { outputId: string }>)} />;
}

function NotAvailable() {
  return (
    <main style={pageStyle}>
      <div style={{ width: "min(460px,100%)", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔎</div>
        <h1 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 24, color: "var(--ink)", margin: "0 0 10px" }}>
          No encontramos tu resumen
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 22px" }}>
          Puede que el link haya expirado o que lo estés abriendo desde otro dispositivo. Generá uno nuevo en segundos.
        </p>
        <Link href="/generar" style={ctaBtnStyle}>
          Generar mi resumen →
        </Link>
      </div>
    </main>
  );
}

function Result({
  outputId,
  title,
  intro,
  points,
  isPaid,
}: {
  outputId: string;
  title: string;
  intro: string | null;
  points: ResultPoint[];
  isPaid: boolean;
}) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueDone, setRescueDone] = useState(false);

  const total = points.length;
  const lockedCount = isPaid ? 0 : Math.max(0, total - FREE_LIMIT);

  function openPaywall() {
    setShowPaywall(true);
  }

  // Al cerrar el paywall sin pagar → ofrecemos el rescate por mail (una vez).
  function closePaywall() {
    setShowPaywall(false);
    if (!isPaid && !rescueDone) setRescueOpen(true);
  }

  return (
    <main style={pageStyle}>
      <div style={{ width: "min(720px, 100%)" }}>
        {/* marca */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Link
            href="/generar"
            style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: "var(--ink)", textDecoration: "none" }}
          >
            Skill<span style={{ color: "#8b5cf6" }}>io</span>
          </Link>
        </div>

        {/* header */}
        <header style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(16,185,129,.10)",
              border: "1px solid rgba(16,185,129,.25)",
              color: "#0f9d68",
              fontWeight: 700,
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 999,
              marginBottom: 14,
            }}
          >
            ✓ Tu resumen está listo
          </div>
          <h1 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: "clamp(22px,5vw,32px)", lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 8px" }}>
            {title}
          </h1>
          {intro && <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{intro}</p>}
        </header>

        {/* puntos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {points.map((p, i) => {
            const locked = !isPaid && i >= FREE_LIMIT;
            return <PointCard key={i} point={p} index={i} locked={locked} onLockedClick={openPaywall} />;
          })}
        </div>

        {/* CTA desbloquear */}
        {lockedCount > 0 && (
          <div
            style={{
              marginTop: 22,
              background: "linear-gradient(135deg,rgba(139,92,246,.09),rgba(79,125,255,.09))",
              border: "1.5px solid rgba(139,92,246,.25)",
              borderRadius: 20,
              padding: "22px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 17, color: "var(--ink)", marginBottom: 6 }}>
              🔒 Te faltan {lockedCount} tema{lockedCount !== 1 ? "s" : ""} clave
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, marginBottom: 16 }}>
              Desbloqueá el resumen completo y estudiá el apunte entero sin cortes.
            </div>
            <button onClick={openPaywall} style={{ ...ctaBtnStyle, width: "100%", maxWidth: 340, border: "none", cursor: "pointer" }}>
              ⚡ Desbloquear resumen completo
            </button>
          </div>
        )}

        {isPaid && (
          <div style={{ marginTop: 22, textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
            Tenés acceso completo. ¡A estudiar! 💜
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>

      {showPaywall && <SalePopup ctx="resumen" onClose={closePaywall} />}
      {rescueOpen && !rescueDone && (
        <RescuePrompt
          outputId={outputId}
          onClose={() => setRescueOpen(false)}
          onDone={() => {
            setRescueDone(true);
            setRescueOpen(false);
          }}
        />
      )}
    </main>
  );
}

function PointCard({
  point,
  index,
  locked,
  onLockedClick,
}: {
  point: ResultPoint;
  index: number;
  locked: boolean;
  onLockedClick: () => void;
}) {
  return (
    <div
      onClick={locked ? onLockedClick : undefined}
      style={{
        position: "relative",
        background: "var(--card)",
        border: `1px solid ${locked ? "rgba(139,92,246,.22)" : "var(--line)"}`,
        borderRadius: 18,
        padding: "18px 20px",
        boxShadow: "0 6px 22px rgba(31,35,71,.05)",
        cursor: locked ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            background: locked ? "rgba(139,92,246,.10)" : "linear-gradient(135deg,#f5f3ff,#eef2ff)",
          }}
        >
          {locked ? "🔒" : point.emoji || "📌"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 15.5, color: "var(--ink)", marginBottom: 4 }}>
            {point.title}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.55,
              ...(locked
                ? { filter: "blur(5px)", userSelect: "none", opacity: 0.7 }
                : {}),
            }}
          >
            {locked
              ? "Este tema está en el resumen completo. Desbloquealo para verlo entero y dominar el apunte de punta a punta."
              : point.description}
          </div>
          {locked && (
            <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "#7c3aed" }}>
              ✨ Desbloqueá con PRO
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RescuePrompt({
  outputId,
  onClose,
  onDone,
}: {
  outputId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      const r = await fetch("/api/public/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, output_id: outputId }),
      });
      if (!r.ok) {
        setState("error");
        return;
      }
      setState("sent");
      setTimeout(onDone, 1600);
    } catch {
      setState("error");
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,8,28,.72)",
        backdropFilter: "blur(8px)",
        zIndex: 110,
        display: "grid",
        placeItems: "end center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "min(440px,100%)",
          padding: "24px 22px 22px",
          boxShadow: "0 24px 60px rgba(0,0,0,.3)",
          animation: "rescueUp .28s cubic-bezier(.22,1,.36,1) both",
          marginBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        {state === "sent" ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📬</div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 18, color: "var(--ink)", marginBottom: 6 }}>
              ¡Listo! Te lo mandamos
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              Revisá tu correo — te dejamos el link para volver a tu resumen.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💾</div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 19, color: "var(--ink)", marginBottom: 6, lineHeight: 1.25 }}>
              ¿Te lo mandamos por mail para no perderlo?
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, marginBottom: 16 }}>
              Te guardamos el resumen y te mandamos un link para volver cuando quieras, desde cualquier dispositivo.
            </div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error") setState("idle");
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 15px",
                fontSize: 15,
                borderRadius: 13,
                border: `1.5px solid ${state === "error" ? "#ff5b71" : "rgba(139,92,246,.28)"}`,
                outline: "none",
                marginBottom: state === "error" ? 6 : 12,
              }}
            />
            {state === "error" && (
              <div style={{ fontSize: 12.5, color: "#d63a52", marginBottom: 12, fontWeight: 600 }}>
                Revisá que el mail esté bien escrito.
              </div>
            )}
            <button
              onClick={submit}
              disabled={state === "sending"}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                color: "#fff",
                fontFamily: "var(--po)",
                fontWeight: 700,
                fontSize: 15,
                cursor: state === "sending" ? "default" : "pointer",
                boxShadow: "0 8px 22px rgba(124,58,237,.28)",
                opacity: state === "sending" ? 0.7 : 1,
              }}
            >
              {state === "sending" ? "Enviando…" : "Mandámelo 📩"}
            </button>
            <button
              onClick={onClose}
              style={{ width: "100%", marginTop: 10, background: "none", border: "none", fontSize: 13, color: "var(--muted)", cursor: "pointer", opacity: 0.7 }}
            >
              No, gracias
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes rescueUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "34px 18px 48px",
  background:
    "radial-gradient(1200px 600px at 50% -10%, rgba(139,92,246,.14), transparent 60%), var(--bg)",
};

const ctaBtnStyle: React.CSSProperties = {
  display: "inline-block",
  background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
  color: "#fff",
  textDecoration: "none",
  fontFamily: "var(--po)",
  fontWeight: 700,
  fontSize: 15,
  padding: "13px 26px",
  borderRadius: 14,
  boxShadow: "0 8px 22px rgba(124,58,237,.28)",
};
