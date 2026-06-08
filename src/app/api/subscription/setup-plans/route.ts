import { NextRequest, NextResponse } from "next/server";
import { mpCreatePlan } from "@/lib/mercadopago";

// Ruta de configuración única. Llamar una sola vez después del deploy
// para crear los planes en MercadoPago y obtener sus IDs.
// GET /api/subscription/setup-plans?secret=<MP_SETUP_SECRET>
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.MP_SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://skillio.digital";

  const planPro = await mpCreatePlan(
    "Plan PRO Skillio",
    16000,
    `${appUrl}/app?upgraded=1`,
  );

  return NextResponse.json({
    ok: true,
    message:
      "Plan creado. Copiá el ID a la variable de entorno en Vercel.",
    MP_PLAN_ID_PRO: planPro.id,
  });
}
