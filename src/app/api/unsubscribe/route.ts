import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

// Ruta pública (no está en el proxy de Clerk). Da de baja a un mail de la
// secuencia de correos. Soporta:
//  - POST: one-click de Gmail/Yahoo (RFC 8058), sin interacción del usuario.
//  - GET:  click humano desde el navegador, devuelve una página de confirmación.

function parse(req: NextRequest): { email: string; token: string } {
  const sp = req.nextUrl.searchParams;
  return { email: sp.get("e") ?? "", token: sp.get("t") ?? "" };
}

async function optOut(email: string): Promise<void> {
  // Marca la baja. Idempotente: si el mail no es de ningún usuario, no pasa nada.
  await supabaseAdmin()
    .from("users")
    .update({ email_opt_out: true })
    .eq("email", email);
}

export async function POST(req: NextRequest) {
  const { email, token } = parse(req);
  if (!email || !verifyUnsubToken(email, token)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await optOut(email);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { email, token } = parse(req);
  const ok = Boolean(email) && verifyUnsubToken(email, token);
  if (ok) await optOut(email);

  const heading = ok ? "Listo, te diste de baja ✅" : "Link inválido";
  const body = ok
    ? "No vas a recibir más correos de Skillio. Si fue un error, escribinos y te reactivamos."
    : "Este link de baja no es válido o está incompleto.";

  const html = `<!DOCTYPE html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skillio</title></head>
<body style="margin:0;background:#f4efe9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2620;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fff;border-radius:18px;border:1px solid #e7ded2;">
        <tr><td style="padding:32px;">
          <div style="font-weight:800;font-size:22px;letter-spacing:-0.02em;margin-bottom:16px;">Skill<span style="color:#a5402d;">io</span></div>
          <h1 style="margin:0 0 10px;font-size:20px;line-height:1.3;">${heading}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#5b5247;">${body}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
