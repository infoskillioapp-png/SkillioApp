import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }
    const r = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system:
        "Respondé siempre con JSON válido solamente, sin texto adicional antes ni después del JSON.",
      messages,
      maxTokens: 700,
    });
    return NextResponse.json({ text: r.text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/demo]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
