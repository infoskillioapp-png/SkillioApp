import { NextRequest, NextResponse } from "next/server";
import { mpCreatePlan } from "@/lib/mercadopago";

// Ruta de configuración única. Llamar una sola vez después del deploy.
// GET /api/subscription/setup-plans?secret=<MP_SETUP_SECRET>
// Devuelve los IDs de ambos planes → copiarlos a las env vars en Vercel.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.MP_SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://skillio.digital";
  const backUrl = `${appUrl}/app?upgraded=1`;

  const [planMensual, planSemanal] = await Promise.all([
    mpCreatePlan("Plan Mensual Skillio", 15900, backUrl),
    mpCreatePlan("Plan Semanal Skillio", 4900, backUrl, { frequency: 7, frequencyType: "days" }),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Planes creados. Copiá los IDs a las env vars en Vercel.",
    MP_PLAN_ID_PRO: planMensual.id,
    MP_PLAN_ID_SEMANAL: planSemanal.id,
  });
}
