import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Precio del plan (ARS) para el MRR estimado.
export const PRO_PRICE_ARS = 16000;

// Precios Anthropic (USD por millón de tokens) para estimar costo.
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
};
const DEFAULT_PRICE = { in: 3.0, out: 15.0 };

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "pro";
  activated_at: string | null;
  demo_completed: boolean;
  onboarding_completed: boolean;
  created_at: string;
  acquisition: Record<string, string> | null;
  career: string | null;
};

type OutputRow = {
  kind: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  credits_used: number | null;
  created_at: string;
};

type PaymentRow = {
  amount: number;
  created_at: string;
  email?: string | null;
  currency?: string;
  kind?: string;
  status?: string;
};
type FunnelRow = { event: string; step: string | null; user_id: string | null };

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard() {
  const sb = supabaseAdmin();
  const [usersRes, outputsRes, paymentsRes, funnelRes] = await Promise.all([
    sb
      .from("users")
      .select(
        "id,email,full_name,plan,activated_at,demo_completed,onboarding_completed,created_at,acquisition,career",
      )
      .limit(5000),
    sb
      .from("ai_outputs")
      .select("kind,model,input_tokens,output_tokens,credits_used,created_at")
      .order("created_at", { ascending: false })
      .limit(20000),
    sb.from("payments").select("amount,created_at,email").limit(5000),
    sb.from("funnel_events").select("event,step,user_id").limit(50000),
  ]);

  const users = (usersRes.data ?? []) as UserRow[];
  const outputs = (outputsRes.data ?? []) as OutputRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const funnel = (funnelRes.data ?? []) as FunnelRow[];

  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  // ---- KPIs de usuarios ----
  const totalUsers = users.length;
  const pro = users.filter((u) => u.plan === "pro").length;
  const activated = users.filter((u) => u.activated_at).length;
  const demoDone = users.filter((u) => u.demo_completed).length;
  const onboarded = users.filter((u) => u.onboarding_completed).length;
  const reg7 = users.filter((u) => u.created_at >= d7).length;
  const reg30 = users.filter((u) => u.created_at >= d30).length;
  const act7 = users.filter((u) => u.activated_at && u.activated_at >= d7).length;
  const activationRate = onboarded > 0 ? activated / onboarded : 0;

  // ---- Usos / tokens / costo ----
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

  // ---- Pagos ----
  const revenueArs = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const mrrArs = pro * PRO_PRICE_ARS;

  // ---- Series diarias (últimos 30 días) ----
  const days = lastNDays(30);
  const regByDay: Record<string, number> = {};
  const actByDay: Record<string, number> = {};
  const genByDay: Record<string, number> = {};
  for (const u of users) {
    const k = dayKey(u.created_at);
    regByDay[k] = (regByDay[k] ?? 0) + 1;
    if (u.activated_at) {
      const ak = dayKey(u.activated_at);
      actByDay[ak] = (actByDay[ak] ?? 0) + 1;
    }
  }
  for (const o of outputs) {
    const k = dayKey(o.created_at);
    genByDay[k] = (genByDay[k] ?? 0) + 1;
  }
  const series = days.map((day) => ({
    day,
    registros: regByDay[day] ?? 0,
    activaciones: actByDay[day] ?? 0,
    generaciones: genByDay[day] ?? 0,
  }));

  // ---- Funnel del onboarding/demo ----
  const uniqByStep = (event: string, step: string) => {
    const set = new Set<string>();
    for (const f of funnel) {
      if (f.event === event && f.step === step && f.user_id) set.add(f.user_id);
    }
    return set.size;
  };
  const demoCompletedUsers = new Set(
    funnel.filter((f) => f.event === "demo_completed" && f.user_id).map((f) => f.user_id!),
  ).size;
  const funnelSteps = [
    { label: "Entró al demo (paso 1)", value: uniqByStep("demo_step_enter", "demo_1") },
    { label: "Llegó al simulacro (paso 2)", value: uniqByStep("demo_step_enter", "demo_2") },
    { label: "Llegó al paso 3", value: uniqByStep("demo_step_enter", "demo_3") },
    { label: "Completó el demo", value: demoCompletedUsers },
    { label: "Activó (material propio)", value: activated },
  ];

  // ---- Adquisición por UTM ----
  const acqMap: Record<string, { total: number; activated: number; pro: number }> = {};
  for (const u of users) {
    const src = u.acquisition?.utm_source ?? "directo / orgánico";
    if (!acqMap[src]) acqMap[src] = { total: 0, activated: 0, pro: 0 };
    acqMap[src].total++;
    if (u.activated_at) acqMap[src].activated++;
    if (u.plan === "pro") acqMap[src].pro++;
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

  return {
    kpis: {
      totalUsers,
      onboarded,
      pro,
      activated,
      demoDone,
      reg7,
      reg30,
      act7,
      activationRate,
      totalGenerations: outputs.length,
      gen7,
      inTok,
      outTok,
      totalTokens: inTok + outTok,
      costUsd,
      revenueArs,
      mrrArs,
      paymentsCount: payments.length,
    },
    series,
    funnelSteps,
    acquisition,
    usageByKind,
    usageByModel,
  };
}

// ---- Lista de usuarios (con búsqueda) ----
export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "pro";
  credits: number;
  free_generations_used: number;
  activated_at: string | null;
  demo_completed: boolean;
  onboarding_completed: boolean;
  current_streak: number;
  total_xp: number;
  career: string | null;
  institution: string | null;
  phone: string | null;
  acquisition: Record<string, string> | null;
  created_at: string;
};

export async function listUsers(search?: string, limit = 100): Promise<AdminUserRow[]> {
  const sb = supabaseAdmin();
  let q = sb
    .from("users")
    .select(
      "id,email,full_name,plan,credits,free_generations_used,activated_at,demo_completed,onboarding_completed,current_streak,total_xp,career,institution,phone,acquisition,created_at",
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
  const [u, outputs, pays] = await Promise.all([
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
  ]);
  return {
    user: u.data as AdminUserRow | null,
    outputs: (outputs.data ?? []) as OutputRow[],
    payments: (pays.data ?? []) as PaymentRow[],
  };
}

export async function getRecentPayments(limit = 30) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("payments")
    .select("amount,currency,kind,status,email,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
