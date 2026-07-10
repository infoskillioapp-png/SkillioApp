import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { resolveActor } from "@/lib/actor";
import { recordAiUsage } from "@/lib/ai/usage";

const CHAT_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `Sos Booki, el asistente de estudio de Skillio. Hablás en español rioplatense, con tono amigable y cercano como el de un compañero de estudio que sabe mucho.

Reglas:
- Respondés preguntas de estudio, explicás conceptos, resolvés dudas y dás consejos de aprendizaje.
- Usás analogías cotidianas para explicar conceptos difíciles.
- Tus respuestas son concisas: máx 3-4 oraciones salvo que el tema lo requiera.
- Si el estudiante te da contexto de la página en que está, lo usás para dar respuestas más relevantes.
- Nunca decís que sos una IA de Anthropic. Sos Booki, el profe de Skillio.
- Usás emojis con moderación (1 por mensaje máx).`;

// GET: endpoint de diagnóstico — abrí /api/ai/booki-chat en el browser
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

export async function POST(req: Request) {
  try {
    const actor = await resolveActor();

    const body = await req.json();
    const { messages: rawMessages, pageContext } = body;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0)
      return NextResponse.json({ error: "messages required" }, { status: 400 });

    // Tipado explícito para evitar problemas con el SDK
    const messages = rawMessages
      .filter((m: { role?: string; content?: string }) => m.role && typeof m.content === "string")
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    if (messages.length === 0)
      return NextResponse.json({ error: "no valid messages" }, { status: 400 });

    const system = pageContext ? `${SYSTEM}\n\nContexto de la página actual: ${pageContext}` : SYSTEM;

    const result = await generateText({
      model: anthropic(CHAT_MODEL),
      system,
      messages,
      maxOutputTokens: 300,
    });

    await recordAiUsage({ kind: "chat", model: CHAT_MODEL, usage: result.usage, userDbId: actor.id });
    return NextResponse.json({ text: result.text.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/ai/booki-chat]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
