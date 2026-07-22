import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

// Tope por parte: lo que primero se pase. El peso es lo que de verdad predice
// si una generación va a andar bien (un PDF con fotos pesa mucho más por
// página que uno de puro texto) — la página es solo lo que el estudiante
// entiende, así que se la mostramos a él pero el corte real lo decide el peso.
const MAX_PART_BYTES = 300 * 1024; // 300 KB
const MAX_PART_PAGES = 20;

type Segment = { title: string; page_from: number; page_to: number };

async function sliceSizeBytes(doc: PDFDocument, start0: number, end0: number): Promise<number> {
  const sub = await PDFDocument.create();
  const indices = Array.from({ length: end0 - start0 + 1 }, (_, k) => start0 + k);
  const pages = await sub.copyPages(doc, indices);
  pages.forEach((p) => sub.addPage(p));
  const bytes = await sub.save();
  return bytes.length;
}

// Arma las partes creciendo página por página (búsqueda binaria por tramo)
// hasta el primero de los dos topes que se cumpla: 300 KB o 20 páginas. Si
// una sola página ya pesa más de 300 KB, va sola (no se puede achicar más).
async function buildSmartSegments(doc: PDFDocument): Promise<Segment[]> {
  const total = doc.getPageCount();
  const segments: Segment[] = [];
  let start0 = 0;
  let idx = 1;

  while (start0 < total) {
    const hardEnd0 = Math.min(start0 + MAX_PART_PAGES - 1, total - 1);

    const oneSize = await sliceSizeBytes(doc, start0, start0);
    if (oneSize > MAX_PART_BYTES) {
      segments.push({ title: `Parte ${idx}`, page_from: start0 + 1, page_to: start0 + 1 });
      start0 += 1;
      idx++;
      continue;
    }

    let lo = start0, hi = hardEnd0, best = start0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const size = await sliceSizeBytes(doc, start0, mid);
      if (size <= MAX_PART_BYTES) { best = mid; lo = mid + 1; }
      else { hi = mid - 1; }
    }

    segments.push({ title: `Parte ${idx}`, page_from: start0 + 1, page_to: best + 1 });
    start0 = best + 1;
    idx++;
  }

  return segments;
}

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return NextResponse.json({ error: "empty" }, { status: 400 });
    const doc = await PDFDocument.load(new Uint8Array(buf), { ignoreEncryption: true });
    const pages = doc.getPageCount();
    const segments = await buildSmartSegments(doc);
    return NextResponse.json({ pages, segments, needsSplit: segments.length > 1 });
  } catch {
    return NextResponse.json({ error: "invalid_pdf" }, { status: 400 });
  }
}
