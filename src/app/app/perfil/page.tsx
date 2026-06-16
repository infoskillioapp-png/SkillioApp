import { redirect } from "next/navigation";
import { getCurrentSkillioUser } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { levelProgress } from "@/lib/level";
import { CancelSubscription, SignOut } from "./_components/billing-actions";

export const dynamic = "force-dynamic";

function fmtArs(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export default async function PerfilPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const { data: payments } = await supabaseAdmin()
    .from("payments")
    .select("amount, currency, kind, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);

  const isPro = user.plan === "pro";
  const level = levelProgress(user.total_xp);
  const initials =
    user.full_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ??
    user.email.slice(0, 2).toUpperCase();
  const memberSince = new Date(user.created_at).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const datos: [string, string][] = [
    ["Email", user.email],
    ["Teléfono", user.phone ?? "—"],
    ["Edad", user.age ? String(user.age) : "—"],
    ["Carrera", user.career ?? "—"],
    ["Institución", user.institution ?? "—"],
    ["Miembro desde", memberSince],
  ];

  return (
    <div className="px-5 sm:px-10 py-6 sm:py-10 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] font-display text-xl font-bold text-[#FBF1EF]">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em] truncate">
            {user.full_name ?? user.email.split("@")[0]}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                isPro ? "bg-accent text-[#FBF1EF]" : "bg-paper-warm text-ink-soft border border-rule-soft"
              }`}
            >
              {isPro ? "PRO ✦" : "Gratis"}
            </span>
            <span className="text-[12px] text-ink-soft">Nivel {level.level} · 🔥 {user.current_streak}d</span>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Datos personales */}
        <section className="rounded-2xl border border-rule-soft bg-paper p-5">
          <h2 className="font-display font-bold text-[15px] mb-3">Datos personales</h2>
          <dl className="flex flex-col gap-2 text-[13px]">
            {datos.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-rule-soft py-1.5">
                <dt className="text-ink-soft shrink-0">{k}</dt>
                <dd className="font-semibold text-right truncate">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] text-ink-softer mt-3">
            Para cambiar tus datos, escribinos a soporte.
          </p>
        </section>

        {/* Plan & facturación */}
        <section className="rounded-2xl border border-rule-soft bg-paper p-5">
          <h2 className="font-display font-bold text-[15px] mb-3">Plan y facturación</h2>

          <div className="rounded-xl bg-paper-warm border border-rule-soft p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-bold text-[15px]">{isPro ? "Skillio PRO" : "Plan Gratis"}</span>
              {isPro && <span className="font-display font-bold text-accent">{fmtArs(16000)}/mes</span>}
            </div>
            <p className="text-[12px] text-ink-soft">
              {isPro
                ? "IA ilimitada. Se renueva mensualmente por MercadoPago."
                : `Te quedan ${Math.max(0, 3 - user.free_generations_used)} de 3 generaciones gratis. Pasate a PRO para usar la IA sin límites.`}
            </p>
          </div>

          {/* Historial de pagos */}
          <div className="mb-4">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-soft font-semibold mb-2">
              Historial de pagos
            </div>
            {payments && payments.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[12.5px] border-b border-rule-soft py-1.5">
                    <span className="text-ink-soft">{new Date(p.created_at).toLocaleDateString("es-AR")}</span>
                    <span className="font-semibold num">{fmtArs(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-ink-soft">Todavía no tenés pagos registrados.</p>
            )}
          </div>

          {/* Acciones */}
          <div className="border-t border-rule-soft pt-4 flex flex-col gap-3">
            {isPro && <CancelSubscription />}
            <SignOut />
          </div>
        </section>
      </div>
    </div>
  );
}
