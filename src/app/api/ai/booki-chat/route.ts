import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";

const SYSTEM = `Sos Booki, el asistente de estudio de Skillio. Hablás en español rioplatense, con tono amigable y cercano como el de un compañero de estudio que sabe mucho.

Reglas:
- Respondés preguntas de estudio, explicás conceptos, resolvés dudas y dás consejos de aprendizaje.
- Usás analogías cotidianas para explicar conceptos difíciles.
- Tus respuestas son concisas: máx 3-4 oraciones salvo que el tema lo requiera.
- Si el estudiante te da contexto de la página en que está, lo usás para dar respuestas más relevantes.
- Nunca decís que sos una IA de Anthropic. Sos Booki, el profe de Skillio.
- Usás emojis con moderación (1 por mensaje máx).`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("unauthenticated", { status: 401 });

  const { messages, pageContext } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0)
    return new Response("messages required", { status: 400 });

  const system = pageContext ? `${SYSTEM}\n\nContexto de la página actual: ${pageContext}` : SYSTEM;

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages,
    maxOutputTokens: 300,
  });

  return result.toTextStreamResponse();
}
