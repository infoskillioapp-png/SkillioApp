import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { DEMO } from "@/lib/demo/demo-source";

// Demo del onboarding: genera el resumen REAL del apunte base con Haiku y lo
// devuelve como stream de texto, para que el usuario VEA cómo se escribe en vivo
// (el momento dopamina). No descuenta créditos ni generaciones gratis: es guiado.
export const runtime = "nodejs";

const SYSTEM = `Sos 'Booki', la IA de estudio de Skillio. Transformás un apunte en los PUNTOS CLAVE más importantes para repasar antes de un parcial.
Reglas:
- Español rioplatense, cercano pero claro.
- Devolvé SOLO Markdown (sin bloque de código, sin explicar qué vas a hacer).
- Empezá con un "# " y un título corto del tema.
- Luego 5 a 7 puntos clave. Cada punto es una línea que empieza con un emoji representativo + un **título corto en negrita** + " — " + una explicación de 1 oración.
- No inventes nada que no esté en el apunte. Sé conciso y escaneable.`;

export async function POST() {
  try {
    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Apunte: "${DEMO.title}"\n\n---\n${DEMO.text}\n---\n\nGenerá los puntos clave de este material.`,
        },
      ],
      maxOutputTokens: 900,
    });
    return result.toTextStreamResponse();
  } catch (e) {
    console.error("[api/demo/summary]", e);
    return new Response(JSON.stringify({ error: "demo_summary_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
