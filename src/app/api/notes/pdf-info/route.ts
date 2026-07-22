import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

// Tope de páginas por parte: es por coherencia pedagógica (no mezclar
// demasiados temas en un mismo set de estudio), no por peso — el peso del
// PDF nativo (con diseño, colores, logos) no predice nada una vez que la
// generación usa el texto extraído del PDF, que pesa una fracción de eso
// sin importar cuántas imágenes tenga el original.
const MAX_PART_PAGES = 20;

type Segment = { title: string; page_from: number; page_to: number };

function buildSegments(totalPages: number): Segment[] {
  const segments: Segment[] = [];
  let start = 1;
  let idx = 1;
  while (start <= totalPages) {
    const end = Math.min(start + MAX_PART_PAGES - 1, totalPages);
    segments.push({ title: `Parte ${idx}`, page_from: start, page_to: end });
    start = end + 1;
    idx++;
  }
  return segments;
}

export async function POST(req: Request) {
  try {
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return NextResponse.json({ error: "empty" }, { status: 400 });
    const doc = await PDFDocument.load(new Uint8Array(buf), { ignoreEncryption: true });
    const pages = doc.getPageCount();
    const segments = buildSegments(pages);
    return NextResponse.json({ pages, segments, needsSplit: segments.length > 1 });
  } catch {
    return NextResponse.json({ error: "invalid_pdf" }, { status: 400 });
  }
}
