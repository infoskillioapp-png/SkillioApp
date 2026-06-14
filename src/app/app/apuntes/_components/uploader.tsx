"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Subject } from "@/lib/types";

// Los PDFs largos se trocean y procesan solos en el servidor (auto-split), así
// que ya no pedimos dividir a mano. Solo bloqueamos archivos absurdamente grandes.
const MAX_PDF_PAGES = 400;

// Lee el binario del PDF y cuenta páginas sin librerías externas.
// Funciona para PDFs estándar (cross-reference table). Devuelve null si
// no puede determinarlo (PDFs con object streams comprimidos) → se permite subir.
async function getPdfPageCount(file: File): Promise<number | null> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("latin1").decode(new Uint8Array(buffer));

  // Estrategia 1: contar entradas /Type /Page (excluyendo /Pages)
  const pageEntries = text.match(/\/Type[\s]*\/Page(?!s)/g);
  if (pageEntries && pageEntries.length > 0) return pageEntries.length;

  // Estrategia 2: buscar /Count N en el árbol de páginas
  const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)];
  if (countMatches.length > 0) {
    return Math.max(...countMatches.map((m) => parseInt(m[1], 10)));
  }

  return null; // No determinable → permitir subida
}

type Props = { subjects: Subject[] };

export function Uploader({ subjects }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [pageErr, setPageErr] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");

  async function uploadFile(file: File) {
    setErr(null);
    setPageErr(false);

    // Validación de páginas solo para PDFs
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pages = await getPdfPageCount(file);
      if (pages !== null && pages > MAX_PDF_PAGES) {
        setPageErr(true);
        // Limpiar el input para que el usuario pueda seleccionar otro archivo
        if (inputRef.current) inputRef.current.value = "";
        throw new Error("too_many_pages");
      }
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name);
    if (subjectId) fd.append("subject_id", subjectId);

    const res = await fetch("/api/notes/upload", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  }

  function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setPageErr(false);
    setErr(null);
    const f = files[0];
    startTransition(async () => {
      try {
        await uploadFile(f);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "upload_failed";
        if (msg !== "too_many_pages") setErr(msg);
      }
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
          pageErr
            ? "border-warning/50 bg-warning-soft"
            : drag
              ? "border-accent bg-accent-soft"
              : "border-accent/30 bg-accent-softer hover:border-accent/60"
        } ${pending ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.doc,.docx"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <span
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
              pageErr ? "bg-warning text-white" : "bg-accent text-[#FBF1EF]"
            }`}
          >
            {pageErr ? "⚠️" : "↑"}
          </span>
          <div>
            <div className="font-display font-bold text-lg">
              {pending ? "Subiendo…" : "Arrastrá tu archivo o hacé click"}
            </div>
            <div className="text-[12.5px] text-ink-soft">
              PDF, imágenes, Word o texto · hasta 25MB · los PDFs largos se procesan solos
            </div>
          </div>
        </div>

        {subjects.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-5 inline-flex items-center gap-2 text-[12.5px] text-ink-soft"
          >
            <span>Asociar a materia:</span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-full border border-rule bg-paper text-ink text-[12.5px]"
            >
              <option value="">— sin materia —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error de páginas — diseño premium */}
      {pageErr && (
        <div className="mt-3 flex items-start gap-3 px-5 py-4 rounded-2xl border border-warning/30 bg-warning-soft">
          <span className="text-xl shrink-0 mt-0.5">⚠️</span>
          <div>
            <div className="font-display font-semibold text-[13.5px] text-warning mb-0.5">
              El archivo es enorme
            </div>
            <p className="text-[12.5px] text-ink-soft leading-snug">
              Este PDF supera las
              <strong className="text-ink"> {MAX_PDF_PAGES} páginas</strong>. Subí uno
              más chico (los PDFs largos igual se procesan solos, pero este es demasiado).
            </p>
          </div>
        </div>
      )}

      {/* Error genérico de subida */}
      {err && (
        <div className="mt-3 px-4 py-2 rounded-xl bg-accent-soft text-accent text-[12.5px]">
          Error: {err}
        </div>
      )}
    </div>
  );
}
