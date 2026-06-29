import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Precios de los planes (ARS). El MRR se normaliza a equivalente mensual.
// ---------------------------------------------------------------------------
export const PLAN_PRICES = { semanal: 4900, pro: 15900, trimestral: 34900 } as const;
const MRR_MONTHLY = {
  semanal: PLAN_PRICES.semanal * (52 / 12),
  pro: PLAN_PRICES.pro,
  trimestral: PLAN_PRICES.trimestral / 3,
};

const PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-haiku-4-5": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
};
const DEFAULT_PRICE = { in: 3.0, out: 15.0 };

type Plan = "free" | "pro" | "semanal" | "trimestral";

export type RangeInput = { fromISO: string; toISO: string };

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}
// Lista de días (YYYY-MM-DD) entre from y to, inclusive (cap 180 para no explotar).
function daysBetween(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const start = new Date(fromISO.slice(0, 10) + "T00:00:00Z").getTime();
  const end = new Date(toISO.slice(0, 10) + "T00:00:00Z").getTime();
  const n = Math.min(180, Math.max(1, Math.round((end - start) / 86400000) + 1));
  for (let i = 0; i < n; i++) out.push(new Date(start + i * 86400000).toISOString().slice(0, 10));
  return out;
}
const isPaid = (p: Plan) => p === "pro" || p === "semanal" || p === "trimestral";

type UserRow = {
  id: string;
  email: string;
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
type PaymentRow = { amount: number; created_at: string; user_id: string | null };
type FunnelRow = { event: string; step: string | null; user_id: string | null; created_at: string };
type NoteRow = { user_id: string | null; created_at: string };
type PomodoroRow = { completed: boolean | null; started_at: string | null };

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(range: RangeInput) {
  const { fromISO, toISO } = range;
  const inRange = (iso: string | null | undefined) => !!iso && iso >= fromISO && iso <= toISO;

  const sb = supabaseAdmin();
  const [usersRes, outputsRes, paymentsRes, funnelRes, notesRes, pomoRes] = await Promise.all([
    sb
      .from("users")
      .select("id,email,plan,activated_at,onboarding_completed,created_at,acquisition,current_streak,total_xp")
      .limit(20000),
    sb.from("ai_outputs").select("kind,model,input_tokens,output_tokens,created_at").limit(50000),
    sb.from("payments").select("amount,created_at,user_id").limit(20000),
    sb.from("funnel_events").select("event,step,user_id,created_at").limit(200000),
    sb.from("notes").select("user_id,created_at").limit(100000),
    sb.from("pomodoro_sessions").select("completed,started_at").limit(100000),
  ]);

  const allUsers = (usersRes.data ?? []) as UserRow[];
  const allOutputs = (outputsRes.data ?? []) as OutputRow[];
  const allPayments = (paymentsRes.data ?? []) as PaymentRow[];
  const allFunnel = (funnelRes.data ?? []) as FunnelRow[];
  const allNotes = (notesRes.data ?? []) as NoteRow[];
  const allPomos = (pomoRes.data ?? []) as PomodoroRow[];

  // ====== PERÍODO SELECCIONADO ======
  // Cohorte: usuarios registrados dentro del rango (base del funnel).
  const cohort = allUsers.filter((u) => inRange(u.created_at));
  const cohortIds = new Set(cohort.map((u) => u.id));

  const outputs = allOutputs.filter((o) => inRange(o.created_at)); // volumen en ventana
  const payments = allPayments.filter((p) => inRange(p.created_at));
  const funnel = allFunnel.filter((f) => inRange(f.created_at));
  const pomos = allPomos.filter((p) => inRange(p.started_at));

  // KPIs del período
  const registros = cohort.length;
  const activadosCohort = cohort.filter((u) => u.activated_at).length;
  const activationRate = registros > 0 ? activadosCohort / registros : 0;
  const reg7 = allUsers.filter((u) => u.created_at >= new Date(Date.now() - 7 * 86400000).toISOString()).length;

  const generaciones = outputs.length;
  let inTok = 0, outTok = 0, costUsd = 0;
  const byKind: Record<string, number> = {};
  const byModel: Record<string, { count: number; inTok: number; outTok: number }> = {};
  for (const o of outputs) {
    byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
    const i = o.input_tokens ?? 0, ot = o.output_tokens ?? 0;
    inTok += i; outTok += ot;
    const model = o.model ?? "desconocido";
    if (!byModel[model]) byModel[model] = { count: 0, inTok: 0, outTok: 0 };
    byModel[model].count++; byModel[model].inTok += i; byModel[model].outTok += ot;
    const p = PRICES[model] ?? DEFAULT_PRICE;
    costUsd += (i / 1e6) * p.in + (ot / 1e6) * p.out;
  }
  const revenueArs = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // ====== ESTADO ACTUAL (global, no depende del rango) ======
  const planCounts: Record<Plan, number> = { free: 0, pro: 0, semanal: 0, trimestral: 0 };
  for (const u of allUsers) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1;
  const paying = planCounts.pro + planCounts.semanal + planCounts.trimestral;
  const payRate = allUsers.length > 0 ? paying / allUsers.length : 0;
  const mrrArs =
    planCounts.pro * MRR_MONTHLY.pro +
    planCounts.semanal * MRR_MONTHLY.semanal +
    planCounts.trimestral * MRR_MONTHLY.trimestral;
  const totalRevenueAll = allPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // ====== FUNNEL (sobre la cohorte registrada en el rango) ======
  // Sets históricos por usuario (cualquier fecha): "¿hasta dónde llegó esta cohorte?"
  const notesUserSet = new Set(allNotes.map((n) => n.user_id).filter(Boolean) as string[]);
  const paywallSeenSet = new Set(
    allFunnel.filter((f) => f.event === "paywall_visto" && f.user_id).map((f) => f.user_id!),
  );
  const checkoutSet = new Set(
    allFunnel.filter((f) => f.event === "checkout_iniciado" && f.user_id).map((f) => f.user_id!),
  );
  const paidUserSet = new Set(allPayments.map((p) => p.user_id).filter(Boolean) as string[]);
  const payingNowSet = new Set(allUsers.filter((u) => isPaid(u.plan)).map((u) => u.id));

  const countCohort = (set: Set<string>) => {
    let c = 0;
    for (const id of cohortIds) if (set.has(id)) c++;
    return c;
  };
  const subieron = countCohort(notesUserSet);
  const activaron = cohort.filter((u) => u.activated_at).length;
  const vieronPaywall = countCohort(paywallSeenSet);
  const iniciaronCheckout = countCohort(checkoutSet);
  const pagaron = (() => {
    let c = 0;
    for (const id of cohortIds) if (paidUserSet.has(id) || payingNowSet.has(id)) c++;
    return c;
  })();

  const funnelSteps = [
    { label: "Registros", value: registros },
    { label: "Subieron un apunte", value: subieron },
    { label: "Activaron (generaron con lo suyo)", value: activaron },
    { label: "Vieron el paywall", value: vieronPaywall },
    { label: "Iniciaron checkout", value: iniciaronCheckout },
    { label: "Pagaron", value: pagaron },
  ];

  const paywallConv = {
    visto: vieronPaywall,
    checkout: iniciaronCheckout,
    pago: pagaron,
    checkoutRate: vieronPaywall > 0 ? iniciaronCheckout / vieronPaywall : 0,
    pagoRate: vieronPaywall > 0 ? pagaron / vieronPaywall : 0,
  };

  // Plan elegido al clickear en el paywall (eventos del período)
  const planClickMap: Record<string, number> = {};
  for (const f of funnel) {
    if (f.event === "paywall_plan_click" && f.step) planClickMap[f.step] = (planClickMap[f.step] ?? 0) + 1;
  }
  const planClicks = Object.entries(planClickMap)
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  // ====== SERIES diarias (en el rango) ======
  const days = daysBetween(fromISO, toISO);
  const regByDay: Record<string, number> = {};
  const actByDay: Record<string, number> = {};
  const genByDay: Record<string, number> = {};
  const revByDay: Record<string, number> = {};
  for (const u of cohort) regByDay[dayKey(u.created_at)] = (regByDay[dayKey(u.created_at)] ?? 0) + 1;
  for (const u of allUsers) if (inRange(u.activated_at)) actByDay[dayKey(u.activated_at!)] = (actByDay[dayKey(u.activated_at!)] ?? 0) + 1;
  for (const o of outputs) genByDay[dayKey(o.created_at)] = (genByDay[dayKey(o.created_at)] ?? 0) + 1;
  for (const p of payments) revByDay[dayKey(p.created_at)] = (revByDay[dayKey(p.created_at)] ?? 0) + Number(p.amount || 0);
  const series = days.map((day) => ({
    day,
    registros: regByDay[day] ?? 0,
    activaciones: actByDay[day] ?? 0,
    generaciones: genByDay[day] ?? 0,
    ingresos: Math.round(revByDay[day] ?? 0),
  }));

  // ====== Engagement (en el rango) ======
  const pomosCompleted = pomos.filter((p) => p.completed).length;
  const simulacros = byKind["simulacro"] ?? 0;
  const usersWithStreak = allUsers.filter((u) => (u.current_streak ?? 0) > 0).length; // estado actual
  const totalXp = allUsers.reduce((s, u) => s + (u.total_xp ?? 0), 0); // estado actual

  // ====== Adquisición por UTM (cohorte del rango) ======
  const acqMap: Record<string, { total: number; activated: number; paying: number }> = {};
  for (const u of cohort) {
    const src = u.acquisition?.utm_source ?? "directo / orgánico";
    if (!acqMap[src]) acqMap[src] = { total: 0, activated: 0, paying: 0 };
    acqMap[src].total++;
    if (u.activated_at) acqMap[src].activated++;
    if (isPaid(u.plan)) acqMap[src].paying++;
  }
  const acquisition = Object.entries(acqMap)
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.total - a.total);

  const usageByKind = Object.entries(byKind).map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);
  const usageByModel = Object.entries(byModel).map(([model, v]) => ({ model, ...v })).sort((a, b) => b.count - a.count);

  const planBreakdown = [
    { plan: "Mensual PRO", count: planCounts.pro },
    { plan: "Trimestral", count: planCounts.trimestral },
    { plan: "Semanal", count: planCounts.semanal },
    { plan: "Free", count: planCounts.free },
  ];

  // ====== TOUR GUIADO (eventos del período) ======
  // Eventos: tour_inicio (step=tour), tour_paso (step=tour:N), tour_completado,
  // tour_skip (step=tour:N). Agregamos por tour y por etapa.
  const emailById = new Map(allUsers.map((u) => [u.id, u.email]));
  const tStart: Record<string, Set<string>> = {};
  const tDone: Record<string, Set<string>> = {};
  const tSkip: Record<string, Set<string>> = {};
  const tStep: Record<string, Record<number, Set<string>>> = {};
  const tSkipAt: Record<string, Record<number, number>> = {};
  const tourNamesSet = new Set<string>();
  for (const f of funnel) {
    if (!f.event.startsWith("tour_") || !f.user_id) continue;
    const parts = (f.step ?? "").split(":");
    const name = parts[0] || "tour";
    const n = parseInt(parts[1] ?? "0", 10) || 0;
    tourNamesSet.add(name);
    if (f.event === "tour_inicio") (tStart[name] ??= new Set()).add(f.user_id);
    else if (f.event === "tour_completado") (tDone[name] ??= new Set()).add(f.user_id);
    else if (f.event === "tour_skip") {
      (tSkip[name] ??= new Set()).add(f.user_id);
      (tSkipAt[name] ??= {})[n] = (tSkipAt[name]?.[n] ?? 0) + 1;
    } else if (f.event === "tour_paso") {
      ((tStep[name] ??= {})[n] ??= new Set()).add(f.user_id);
    }
  }
  const tours = [...tourNamesSet]
    .map((name) => {
      const started = tStart[name]?.size ?? 0;
      const completed = tDone[name]?.size ?? 0;
      const skipped = tSkip[name]?.size ?? 0;
      const steps = Object.entries(tStep[name] ?? {})
        .map(([n, set]) => ({ n: Number(n), users: set.size }))
        .sort((a, b) => a.n - b.n);
      const skipBy = Object.entries(tSkipAt[name] ?? {})
        .map(([n, count]) => ({ n: Number(n), count }))
        .sort((a, b) => a.n - b.n);
      return {
        name,
        started,
        completed,
        skipped,
        completionRate: started > 0 ? completed / started : 0,
        skipRate: started > 0 ? skipped / started : 0,
        steps,
        skipBy,
      };
    })
    .sort((a, b) => b.started - a.started);

  // Lista de quién skipeó (últimos del período)
  const tourSkippers = funnel
    .filter((f) => f.event === "tour_skip" && f.user_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 25)
    .map((f) => {
      const parts = (f.step ?? "").split(":");
      return {
        email: emailById.get(f.user_id!) ?? "—",
        tour: parts[0] || "tour",
        step: Number(parts[1] ?? 0) || 0,
        at: f.created_at,
      };
    });

  return {
    range: { fromISO, toISO },
    kpis: {
      registros,
      activadosCohort,
      activationRate,
      reg7,
      generaciones,
      inTok, outTok, totalTokens: inTok + outTok,
      costUsd,
      revenueArs,
      // estado actual
      paying,
      payRate,
      mrrArs,
      totalUsers: allUsers.length,
      totalRevenueAll,
      pomosCompleted,
      simulacros,
      usersWithStreak,
      totalXp,
    },
    series,
    funnelSteps,
    paywallConv,
    planClicks,
    planBreakdown,
    acquisition,
    usageByKind,
    usageByModel,
    tours,
    tourSkippers,
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
    payments: (pays.data ?? []) as { amount: number; created_at: string }[],
    funnelEvents: (fevents.data ?? []) as { event: string; step: string | null; created_at: string }[],
  };
}

// ---------------------------------------------------------------------------
// Costos de IA: tokens y USD por segmento (FREE / PRO / TOTAL) y por usuario pago.
// "PRO" = cualquier plan pagado (semanal, mensual/pro o trimestral). Se clasifica
// cada generación por el plan ACTUAL del usuario que la hizo.
// ---------------------------------------------------------------------------
export type AiCostBucket = { gen: number; inTok: number; outTok: number; usd: number };
export type AiCostUser = { id: string; email: string; plan: Plan; gen: number; inTok: number; outTok: number; usd: number };

export async function getAiCosts(range: RangeInput) {
  const { fromISO, toISO } = range;
  const sb = supabaseAdmin();
  const [outRes, userRes] = await Promise.all([
    sb
      .from("ai_outputs")
      .select("user_id,model,input_tokens,output_tokens,created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .limit(100000),
    sb.from("users").select("id,email,plan").limit(20000),
  ]);
  const outputs = (outRes.data ?? []) as {
    user_id: string | null; model: string | null; input_tokens: number | null; output_tokens: number | null;
  }[];
  const users = (userRes.data ?? []) as { id: string; email: string; plan: Plan }[];
  const planById = new Map(users.map((u) => [u.id, u.plan]));
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const blank = (): AiCostBucket => ({ gen: 0, inTok: 0, outTok: 0, usd: 0 });
  const free = blank(), pro = blank(), total = blank();
  const perUser = new Map<string, AiCostUser>();

  for (const o of outputs) {
    const i = o.input_tokens ?? 0;
    const ot = o.output_tokens ?? 0;
    const price = PRICES[o.model ?? ""] ?? DEFAULT_PRICE;
    const usd = (i / 1e6) * price.in + (ot / 1e6) * price.out;
    const plan = (o.user_id ? planById.get(o.user_id) : undefined) ?? "free";
    const paid = isPaid(plan);

    const b = paid ? pro : free;
    b.gen++; b.inTok += i; b.outTok += ot; b.usd += usd;
    total.gen++; total.inTok += i; total.outTok += ot; total.usd += usd;

    if (paid && o.user_id) {
      let u = perUser.get(o.user_id);
      if (!u) {
        u = { id: o.user_id, email: emailById.get(o.user_id) ?? "—", plan, gen: 0, inTok: 0, outTok: 0, usd: 0 };
        perUser.set(o.user_id, u);
      }
      u.gen++; u.inTok += i; u.outTok += ot; u.usd += usd;
    }
  }

  return {
    segments: { free, pro, total },
    proUsers: [...perUser.values()].sort((a, b) => b.usd - a.usd),
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
