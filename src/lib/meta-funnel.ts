import "server-only";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { sendMetaEvent } from "@/lib/meta-capi";

/**
 * Eventos del EMBUDO hacia Meta por CAPI (Apunte_Subido, Activacion).
 *
 * Por qué existe: el invitado no tiene mail ni teléfono cuando sube su apunte o
 * genera su primer resumen, y Meta RECHAZA un evento de servidor sin ningún
 * dato de la persona (por eso la "Activacion" nunca aparecía). Acá mandamos lo
 * que sí tenemos siempre: external_id (id de la fila users), IP, navegador y las
 * cookies _fbp/_fbc del píxel. El navegador dispara el MISMO evento con el MISMO
 * event_id → Meta lo cuenta una sola vez.
 *
 * Se manda con after(): el usuario no espera la respuesta de Meta.
 * Solo se puede llamar desde un Route Handler / Server Function (lee la request).
 */
export async function sendMetaFunnelEvent(input: {
  eventName: string;
  eventId: string;
  userId: string;
  email?: string | null;
  phone?: string | null;
  customData?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Leemos la request ACÁ (dentro del request), y mandamos después.
    const jar = await cookies();
    const h = await headers();
    const ctx = {
      fbp: jar.get("_fbp")?.value ?? null,
      fbc: jar.get("_fbc")?.value ?? null,
      clientIp: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null,
      userAgent: h.get("user-agent"),
    };
    after(() =>
      sendMetaEvent({
        eventName: input.eventName,
        eventId: input.eventId,
        email: input.email ?? null,
        phone: input.phone ?? null,
        externalId: input.userId,
        ...ctx,
        sourceUrl: "https://skillio.digital/app",
        customData: input.customData,
      }),
    );
  } catch (e) {
    // Medir nunca rompe el flujo del usuario.
    console.error("[meta-funnel]", input.eventName, e);
  }
}
