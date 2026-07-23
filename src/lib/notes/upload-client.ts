import { supabaseBrowser } from "@/lib/supabase/browser";

// Subida de apuntes desde el navegador DIRECTO a Supabase Storage, sin pasar
// el archivo por una función de Vercel (que topea el body en ~4,5 MB). Flujo:
// 1) pedir URL firmada, 2) subir el archivo a Supabase, 3) crear la(s) nota(s).

const BUCKET = "notes-uploads";
const PAGES_PER_PART = 20; // coherencia pedagógica, no peso

export type Segment = { title: string; page_from: number; page_to: number };

// Cuenta páginas en el navegador (pdf-lib lazy — se baja solo al subir un PDF).
export async function countPdfPages(file: File): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  return doc.getPageCount();
}

export function buildSegments(totalPages: number): Segment[] {
  const segs: Segment[] = [];
  let start = 1;
  let idx = 1;
  while (start <= totalPages) {
    const end = Math.min(start + PAGES_PER_PART - 1, totalPages);
    segs.push({ title: `Parte ${idx}`, page_from: start, page_to: end });
    start = end + 1;
    idx++;
  }
  return segs;
}

type UploadResult = { noteId: string } | { error: string };

export async function directUpload(
  file: File,
  segments: Segment[] | null,
  title?: string,
): Promise<UploadResult> {
  // 1. URL firmada
  const urlRes = await fetch("/api/notes/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mime: file.type }),
  });
  if (!urlRes.ok) {
    const d = await urlRes.json().catch(() => ({}));
    return { error: d?.error === "file_type_not_allowed" ? "Ese tipo de archivo no está soportado." : "No pudimos preparar la subida." };
  }
  const { path, token, mime } = await urlRes.json();

  // 2. subida directa a Supabase
  const up = await supabaseBrowser.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: mime || file.type || undefined });
  if (up.error) return { error: "No pudimos subir el archivo. Probá de nuevo." };

  // 3. crear la(s) nota(s)
  const createRes = await fetch("/api/notes/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, fileName: file.name, mime: file.type, fileSize: file.size, segments, title }),
  });
  const data = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !data?.note?.id) return { error: data?.error ?? "No pudimos crear el apunte." };
  return { noteId: data.note.id };
}
