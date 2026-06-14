import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { DEMO } from "@/lib/demo/demo-source";

// Demo del onboarding: 3 preguntas de opción múltiple REALES generadas con Haiku
// sobre el apunte base. Sin créditos ni generaciones gratis (es guiado).
export const runtime = "nodejs";

const Question = z.object({
  question: z.string().describe("Pregunta clara basada en el apunte"),
  options: z.array(z.string()).length(4).describe("Exactamente 4 opciones plausibles"),
  correct: z.number().int().min(0).max(3).describe("Índice (0-3) de la opción correcta"),
  explanation: z.string().describe("Por qué es correcta, en 1 oración"),
});

const Schema = z.object({
  title: z.string().describe("Título corto del simulacro basado en el apunte"),
  questions: z.array(Question).length(3),
});

const SYSTEM =
  "Sos un docente que arma un mini-simulacro de 3 preguntas de opción múltiple en español rioplatense sobre un apunte. Las preguntas evalúan comprensión real (no trampas), con 4 opciones plausibles cada una. Nunca inventes información que no esté en el apunte.";

export async function POST() {
  try {
    const r = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: Schema,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Apunte: "${DEMO.title}"\n\n---\n${DEMO.text}\n---\n\nArmá un simulacro de EXACTAMENTE 3 preguntas de opción múltiple sobre este apunte.`,
        },
      ],
    });
    return NextResponse.json({ ok: true, simulacro: r.object });
  } catch (e) {
    console.error("[api/demo/simulacro]", e);
    return NextResponse.json({ error: "demo_simulacro_failed" }, { status: 500 });
  }
}
