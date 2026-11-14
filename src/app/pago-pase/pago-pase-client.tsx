"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { pixel } from "@/lib/track-client";
import { productName } from "@/lib/pricing";

type State = "loading" | "pending" | "rejected" | "login" | "error";

export function PagoPaseClient({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { signIn } = useSignIn();
  const [state, setState] = useState<State>(paymentId ? "loading" : "error");
  const [voucher, setVoucher] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!paymentId) return;
    if (!signIn) return; // esperamos a que Clerk cargue
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/checkout/pase/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_id: paymentId }),
        });
        const d = await res.json().catch(() => ({}));
        if (d.status === "pending") { setVoucher(d.voucher_url ?? null); setState("pending"); return; }
        if (d.status === "rejected") { setState("rejected"); return; }
        if (!res.ok || d.status !== "approved") { setState("error"); return; }

        pixel("Purchase", {
          value: d.value, currency: "ARS",
          content_name: productName("pase", !!d.promo), content_ids: ["pase"], content_type: "product",
        }, `purchase_${d.payment_id}`);

        if (d.token) {
          const t = await signIn.ticket({ ticket: d.token });
          if (!t.error) await signIn.finalize();
        } else if (d.needs_login) {
          setState("login");
          return;
        }
        router.replace("/gracias?plan=pase");
      } catch {
        setState("error");
      }
    })();
  }, [paymentId, signIn, router]);

  const box: React.CSSProperties = { width: "min(440px,100%)", background: "#fff", borderRadius: 24, padding: "30px 26px", textAlign: "center", boxShadow: "0 24px 60px rgba(40,30,90,.18)" };
  const btn: React.CSSProperties = { display: "block", marginTop: 18, padding: 14, borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff", fontWeight: 700, textDecoration: "none" };

  return (
    <main style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", padding: 18, background: "var(--bg,#f6f5fb)" }}>
      <div style={box}>
        {state === "loading" && <><div style={{ fontSize: 36 }}>⏳</div><h2>Confirmando tu pago…</h2><p style={{ color: "#5b6178" }}>No cierres esta ventana.</p></>}
        {state === "pending" && <>
          <div style={{ fontSize: 36 }}>🧾</div><h2>¡Ya casi!</h2>
          <p style={{ color: "#5b6178" }}>Tu pago todavía no se acreditó. Apenas se apruebe, tu Pase se activa solo y te llega un mail.</p>
          {voucher && <a href={voucher} target="_blank" rel="noreferrer" style={btn}>Ver mi cupón de pago →</a>}
        </>}
        {state === "rejected" && <>
          <div style={{ fontSize: 36 }}>😕</div><h2>El pago no se aprobó</h2>
          <p style={{ color: "#5b6178" }}>No se te cobró nada. Probá de nuevo con otro medio de pago.</p>
          <Link href="/pagar?plan=pase" style={btn}>Volver a intentar</Link>
        </>}
        {state === "login" && <>
          <div style={{ fontSize: 36 }}>🎉</div><h2>¡Tu Pase está activo!</h2>
          <p style={{ color: "#5b6178" }}>Ingresá con el mail que usaste para pagar: te mandamos un código y listo.</p>
          <Link href="/login" style={btn}>Ingresar</Link>
        </>}
        {state === "error" && <>
          <div style={{ fontSize: 36 }}>🤔</div><h2>No pudimos confirmar el pago</h2>
          <p style={{ color: "#5b6178" }}>Si el cobro se hizo, tu Pase se activa solo en unos minutos y te llega un mail. Si no, escribinos.</p>
          <Link href="/app" style={btn}>Ir a la app</Link>
        </>}
      </div>
    </main>
  );
}
