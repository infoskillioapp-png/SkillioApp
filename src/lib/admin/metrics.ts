import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Precios de los planes (ARS). El MRR se normaliza a equivalente mensual.
// ---------------------------------------------------------------------------
export const PLAN_PRICES = { semanal: 4900, pro: 15900, trimestral: 34900 } as const;
const MRR_MONTHLY = {
  semanal: PLAN_PRICES.semanal * (52 / 12), // semanal → mensual-equivalente
  pro: PLAN_PRICES.pro,
  trimestral: PLAN_PRICES.trimestral / 3,
};

// Precios Anthropic (USD por millón de tokens) para estimar costo de IA.
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-haiku-4-5": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
};
const DEFAULT_PRICE = { in: 3.0, out: 15.0 };

type Plan = "free" | "pro" | "semanal" | "trimestral";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  return days;
}
const isPaid = (p: Plan) => p === "pro" || p === "semanal" || p === "trimestral";

type UserRow = {
  id: string;
  plan: Plan;
  activated_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  acquisition: Record<string, string> | null;
  current_streak: number | null;
  total_xp: number | null;
};
type OutputRow = {
  kind: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};
type PaymentRow = { amount: number; created_at: string };
type FunnelRow = { event: string; step: string | null; user_id: string | null };
type PomodoroRow = { completed: boolean | null };

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard() {
  const sb = supabaseAdmin();
  const [usersRes, outputsRes, paymentsRes, funnelRes, pomoRes] = await Promise.all([
    sb
      .from("users")
      .select("id,plan,activated_at,onboarding_completed,created_at,acquisition,current_streak,total_xp")
      .limit(10000),
    sb
      .from("ai_outputs")
      .select("kind,model,input_tokens,output_tokens,created_at")
      .order("created_at", { ascending: false })
      .limit(30000),
    sb.from("payments").select("amount,created_at").limit(10000),
    sb.from("funnel_events").select("event,step,user_id").limit(100000),
    sb.from("pomodoro_sessions").select("completed").limit(50000),
  ]);

  const users = (usersRes.data ?? []) as UserRow[];
  const outputs = (outputsRes.data ?? []) as OutputRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const funnel = (funnelRes.data ?? []) as FunnelRow[];
  const pomos = (pomoRes.data ?? []) as PomodoroRow[];

  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  // ---- KPIs de usuarios / planes ----
  const totalUsers = users.length;
  const onboarded = users.filter((u) => u.onboarding_completed).length;
  const activated = users.filter((u) => u.activated_at).length;
  const reg7 = users.filter((u) => u.created_at >= d7).length;
  const reg30 = users.filter((u) => u.created_at >= d30).length;
  const act7 = users.filter((u) => u.activated_at && u.activated_at >= d7).length;
  const activationRate = totalUsers > 0 ? activated / totalUsers : 0;

  const planCounts: Record<Plan, number> = { free: 0, pro: 0, semanal: 0, trimestral: 0 };
  for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1;
  const paying = planCounts.pro + planCounts.semanal + planCounts.trimestral;
  const payRate = totalUsers > 0 ? paying / totalUsers : 0;

  const mrrArs =
    planCounts.pro * MRR_MONTHLY.pro +
    planCounts.semanal * MRR_MONTHLY.semanal +
    planCounts.trimestral * MRR_MONTHLY.trimestral;

  // ---- Generaciones / tokens / costo ----
  const gen7 = outputs.filter((o) => o.created_at >= d7).length;
  let inTok = 0;
  let outTok = 0;
  let costUsd = 0;
  const byKind: Record<string, number> = {};
  const byModel: Record<string, { count: number; inTok: number; outTok: number }> = {};
  for (const o of outputs) {
    byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
    const i = o.input_tokens ?? 0;
    const ot = o.output_tokens ?? 0;
    inTok += i;
    outTok += ot;
    const model = o.model ?? "desconocido";
    if (!byModel[model]) byModel[model] = { count: 0, inTok: 0, outTok: 0 };
    byModel[model].count++;
    byModel[model].inTok += i;
    byModel[model].outTok += ot;
    const p = PRICES[model] ?? DEFAULT_PRICE;
    costUsd += (i / 1e6) * p.in + (ot / 1e6) * p.out;
  }

  // ---- Pagos reales ----
  const revenueArs = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const rev30 = payments.filter((p) => p.created_at >= d30).reduce((s, p) => s + Number(p.amount || 0), 0);

  // ---- Engagement de estudio ----
  const pomosCompleted = pomos.filter((p) => p.completed).length;
  const simulacros = byKind["simulacro"] ?? 0;
  const usersWithStreak = users.filter((u) => (u.current_streak ?? 0) > 0).length;
  const totalXp = users.reduce((s, u) => s + (u.total_xp ?? 0), 0);

  // ---- Series diarias (últimos 30 días) ----
  const days = lastNDays(30);
  const regByDay: Record<string, number> = {};
  const actByDay: Record<string, number> = {};
  const genByDay: Record<string, number> = {};
  const revByDay: Record<string, number> = {};
  for (const u of users) {
    regByDay[dayKey(u.created_at)] = (regByDay[dayKey(u.created_at)] ?? 0) + 1;
    if (u.activated_at) actByDay[dayKey(u.activated_at)] = (actByDay[dayKey(u.activated_at)] ?? 0) + 1;
  }
  for (const o of outputs) genByDay[dayKey(o.created_at)] = (genByDay[dayKey(o.created_at)] ?? 0) + 1;
  for (const p of payments) revByDay[dayKey(p.created_at)] = (revByDay[dayKey(p.created_at)] ?? 0) + Number(p.amount || 0);
  const series = days.map((day) => ({
    day,
    registros: regByDay[day] ?? 0,
    activaciones: actByDay[day] ?? 0,
    generaciones: genByDay[day] ?? 0,
    ingresos: Math.round(revByDay[day] ?? 0),
  }));

  // ---- Funnel nuevo (usuarios únicos por paso) ----
  const uniqUsers = (pred: (f: FunnelRow) => boolean) => {
    const set = new Set<string>();
    for (const f of funnel) if (f.user_id && pred(f)) set.add(f.user_id);
    return set.size;
  };
  const subieron = uniqUsers((f) => f.event === "apunte_subido");
  const vieronPaywall = uniqUsers((f) => f.event === "paywall_visto");
  const iniciaronCheckout = uniqUsers((f) => f.event === "checkout_iniciado");

  const funnelSteps = [
    { label: "Registros", value: totalUsers },
    { label: "Subieron un apunte", value: subieron },
    { label: "Activaron (generaron con lo suyo)", value: activated },
    { label: "Vieron el paywall", value: vieronPaywall },
    { label: "Iniciaron checkout", value: iniciaronCheckout },
    { label: "Pagaron", value: paying },
  ];

  // Conversión del paywall: de los que lo vieron, cuántos avanzaron
  const paywallConv = {
    visto: vieronPaywall,
    checkout: iniciaronCheckout,
    pago: paying,
    checkoutRate: vieronPaywall > 0 ? iniciaronCheckout / vieronPaywall : 0,
    pagoRate: vieronPaywall > 0 ? paying / vieronPaywall : 0,
  };

  // Qué paywall se ve más (por contexto)
  const paywallByCtxMap: Record<string, number> = {};
  for (const f of funnel) {
    if (f.event === "paywall_visto") {
      const c = f.step ?? "generic";
      paywallByCtxMap[c] = (paywallByCtxMap[c] ?? 0) + 1;
    }
  }
  const paywallByCtx = Object.entries(paywallByCtxMap)
    .map(([ctx, count]) => ({ ctx, count }))
    .sort((a, b) => b.count - a.count);

  // Plan elegido al hacer click en el paywall
  const planClickMap: Record<string, number> = {};
  for (const f of funnel) {
    if (f.event === "paywall_plan_click" && f.step) planClickMap[f.step] = (planClickMap[f.step] ?? 0) + 1;
  }
  const planClicks = Object.entries(planClickMap)
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  // ---- Adquisición por UTM ----
  const acqMap: Record<string, { total: number; activated: number; paying: number }> = {};
  for (const u of users) {
    const src = u.acquisition?.utm_source ?? "directo / orgánico";
    if (!acqMap[src]) acqMap[src] = { total: 0, activated: 0, paying: 0 };
    acqMap[src].total++;
    if (u.activated_at) acqMap[src].activated++;
    if (isPaid(u.plan)) acqMap[src].paying++;
  }
  const acquisition = Object.entries(acqMap)
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.total - a.total);

  const usageByKind = Object.entries(byKind)
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
  const usageByModel = Object.entries(byModel)
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.count - a.count);

  const planBreakdown = [
    { plan: "Mensual PRO", count: planCounts.pro, price: PLAN_PRICES.pro },
    { plan: "Trimestral", count: planCounts.trimestral, price: PLAN_PRICES.trimestral },
    { plan: "Semanal", count: planCounts.semanal, price: PLAN_PRICES.semanal },
    { plan: "Free", count: planCounts.free, price: 0 },
  ];

  return {
    kpis: {
      totalUsers,
      onboarded,
      activated,
      reg7,
      reg30,
      act7,
      activationRate,
      paying,
      payRate,
      mrrArs,
      revenueArs,
      rev30,
      paymentsCount: payments.length,
      totalGenerations: outputs.length,
      gen7,
      inTok,
      outTok,
      totalTokens: inTok + outTok,
      costUsd,
      pomosCompleted,
      simulacros,
      usersWithStreak,
      totalXp,
    },
    series,
    funnelSteps,
    paywallConv,
    paywallByCtx,
    planClicks,
    planBreakdown,
    acquisition,
    usageByKind,
    usageByModel,
  };
}

// ---------------------------------------------------------------------------
// Lista de usuarios (con búsqueda)
// ---------------------------------------------------------------------------
export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  credits: number;
  free_generations_used: number;
  activated_at: string | null;
  onboarding_completed: boolean;
  current_streak: number;
  total_xp: number;
  career: string | null;
  institution: string | null;
  phone: string | null;
  expires_at: string | null;
  acquisition: Record<string, string> | null;
  created_at: string;
};

export async function listUsers(search?: string, limit = 100): Promise<AdminUserRow[]> {
  const sb = supabaseAdmin();
  let q = sb
    .from("users")
    .select(
      "id,email,full_name,plan,credits,free_generations_used,activated_at,onboarding_completed,current_streak,total_xp,career,institution,phone,expires_at,acquisition,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search && search.trim()) {
    const s = search.trim();
    q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%,career.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[admin.listUsers]", error);
    return [];
  }
  return (data ?? []) as AdminUserRow[];
}

export async function getUserDetail(id: string) {
  const sb = supabaseAdmin();
  const [u, outputs, pays, fevents] = await Promise.all([
    sb.from("users").select("*").eq("id", id).maybeSingle(),
    sb
      .from("ai_outputs")
      .select("kind,format,title,model,credits_used,input_tokens,output_tokens,created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("payments")
      .select("amount,currency,kind,status,created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("funnel_events")
      .select("event,step,created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  return {
    user: u.data as AdminUserRow | null,
    outputs: (outputs.data ?? []) as OutputRow[],
    payments: (pays.data ?? []) as PaymentRow[],
    funnelEvents: (fevents.data ?? []) as { event: string; step: string | null; created_at: string }[],
  };
}

export async function getRecentPayments(limit = 50) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("payments")
    .select("amount,currency,kind,status,email,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
