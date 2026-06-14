import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { readDemoPdf, buildDemoContent } from "@/lib/demo/demo-pdf";

// Demo del onboarding: genera el resumen REAL del apunte base en formato
// "puntos clave" ESTRUCTURADO — el mismo shape que /api/ai/summarize — para que
// el resultado se muestre en el ResultModal idéntico a la app paga (tarjetas con
// colores + descarga a PDF brandeado). Haiku real, sin créditos ni free_gens.
export const runtime = "nodejs";

const KeyPoint = z.object({
  emoji: z.string().describe("Un emoji que represente bien el concepto"),
  title: z.string().describe("Concepto o idea principal en 3-8 palabras"),
  description: z.string().describe("Explicación clara en 1-2 oraciones, autocontenida"),
  category: z
    .string()
    .optional()
    .describe("Subtema dentro del apunte (mismo string para puntos del mismo subtema)"),
});

const Schema = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z.string().optional().describe("Una oración de contexto al inicio (opcional)"),
  points: z.array(KeyPoint).min(5).max(8),
});

const SYSTEM =
  "Sos un asistente de estudio en español rioplatense. Extraés los puntos clave de un apunte para que un estudiante los repase. Cada punto es autocontenido, con un emoji, un título corto y una descripción de 1-2 oraciones. Agrupá por subtema con `category` cuando tenga sentido. Nunca inventes información que no esté en el apunte.";

export async function POST() {
  try {
    const pdf = await readDemoPdf();
    const content = buildDemoContent(pdf, "Extraé entre 5 y 8 puntos clave de este apunte.");
    const r = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: Schema,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    return NextResponse.json({ ok: true, format: "puntos_clave", data: r.object });
  } catch (e) {
    console.error("[api/demo/summary]", e);
    return NextResponse.json({ error: "demo_summary_failed" }, { status: 500 });
  }
}
