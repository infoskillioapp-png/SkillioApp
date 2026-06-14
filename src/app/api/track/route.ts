import { NextResponse } from "next/server";
import { recordFunnelEvent } from "@/lib/api/funnel";

// Beacon de instrumentación del funnel. El cliente lo llama (incluso con
// navigator.sendBeacon) al entrar/salir de cada paso del onboarding/demo.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const event = typeof body.event === "string" ? body.event : null;
    if (!event) return NextResponse.json({ error: "event_required" }, { status: 400 });

    const step = typeof body.step === "string" ? body.step : null;
    const meta =
      body.meta && typeof body.meta === "object" ? (body.meta as Record<string, unknown>) : null;

    await recordFunnelEvent(event, step, meta);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/track]", e);
    // Nunca rompemos por tracking.
    return NextResponse.json({ ok: false });
  }
}
