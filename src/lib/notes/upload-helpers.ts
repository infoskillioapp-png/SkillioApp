import "server-only";

// Helpers compartidos entre la subida vieja (FormData, /api/notes/upload) y la
// nueva subida directa a Supabase desde el navegador (/api/notes/upload-url +
// /api/notes/create), que existe para archivos grandes que superan el límite
// de ~4,5 MB del body de las funciones de Vercel.

export const NOTES_BUCKET = "notes-uploads";

const ALLOWED_PREFIXES = [
  "application/pdf",
  "image/",
  "text/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
];

// Fallback por extensión: muchos navegadores mandan mime vacío u octet-stream.
const EXT_MAP: Record<string, { kind: string; mime: string }> = {
  pdf: { kind: "pdf", mime: "application/pdf" },
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
  gif: { kind: "image", mime: "image/gif" },
  heic: { kind: "image", mime: "image/heic" },
  heif: { kind: "image", mime: "image/heif" },
  txt: { kind: "text", mime: "text/plain" },
  md: { kind: "text", mime: "text/markdown" },
  doc: { kind: "word", mime: "application/msword" },
  docx: {
    kind: "word",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Resuelve tipo/mime a partir del nombre + mime del navegador (strings). Igual
// criterio que la subida vieja pero sin depender de un objeto File.
export function resolveFileMeta(
  name: string,
  browserMime: string | undefined,
): { allowed: boolean; kind: string; mime: string } {
  const mime = browserMime || "";
  const mimeAllowed =
    mime !== "" &&
    mime !== "application/octet-stream" &&
    ALLOWED_PREFIXES.some((p) => mime.startsWith(p));

  if (mimeAllowed) {
    const kind =
      mime === "application/pdf"
        ? "pdf"
        : mime.startsWith("image/")
          ? "image"
          : mime.startsWith("text/")
            ? "text"
            : "word";
    return { allowed: true, kind, mime };
  }

  const byExt = EXT_MAP[fileExt(name)];
  if (byExt) return { allowed: true, kind: byExt.kind, mime: byExt.mime };

  return { allowed: false, kind: "file", mime: mime || "application/octet-stream" };
}
