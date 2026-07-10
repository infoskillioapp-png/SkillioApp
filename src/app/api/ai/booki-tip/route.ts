import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { resolveActor } from "@/lib/actor";
import { recordAiUsage } from "@/lib/ai/usage";

const TIP_MODEL = "claude-haiku-4-5-20251001";

export async function POST(req: Request) {
  try {
    const actor = await resolveActor();

    const { title, description, category } = await req.json();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const result = await generateText({
      model: anthropic(TIP_MODEL),
      system:
        "Sos Booki, un asistente de estudio universitario en español rioplatense. Cuando el estudiante te comparte un concepto, le das UN tip mnemotécnico brevísimo (1 sola oración, máx 25 palabras): una analogía cotidiana, una regla de memoria, un ejemplo visual o una rima que le ayude a recordarlo. Solo el tip, sin saludos ni explicaciones.",
      messages: [
        {
          role: "user",
          content: `Concepto: "${title}"\nDescripción: "${description}"${category ? `\nCategoría: ${category}` : ""}\n\nDame un tip mnemotécnico para recordarlo.`,
        },
      ],
      maxOutputTokens: 80,
    });

    await recordAiUsage({ kind: "tip", model: TIP_MODEL, usage: result.usage, userDbId: actor.id });
    return NextResponse.json({ tip: result.text.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/booki-tip]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
