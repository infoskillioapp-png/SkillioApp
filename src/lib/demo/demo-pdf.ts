import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEMO } from "./demo-source";

// Lee el PDF base del demo desde /public para pasárselo a la IA (igual que la
// app procesa un PDF subido). Devuelve null si no se puede leer (→ fallback texto).
export async function readDemoPdf(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), "public", DEMO.pdfPublicPath);
    const buf = await readFile(p);
    return new Uint8Array(buf);
  } catch (e) {
    console.error("[demo-pdf] no se pudo leer el PDF:", e);
    return null;
  }
}

// Construye el `content` del mensaje de usuario: el PDF como file part (con
// cache control de Anthropic) + la instrucción. Si no hay PDF, usa el texto.
export function buildDemoContent(pdf: Uint8Array | null, instruction: string) {
  if (pdf) {
    return [
      {
        type: "file" as const,
        mediaType: "application/pdf" as const,
        data: pdf,
        filename: DEMO.fileName,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { type: "text" as const, text: instruction },
    ];
  }
  return `Apunte: "${DEMO.title}"\n\n---\n${DEMO.text}\n---\n\n${instruction}`;
}
