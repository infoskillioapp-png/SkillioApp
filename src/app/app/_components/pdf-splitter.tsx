"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PAGE_LIMIT = 30;

type Segment = { title: string; page_from: number; page_to: number };

function defaultSegments(total: number): Segment[] {
  const segs: Segment[] = [];
  let start = 1;
  let idx = 1;
  while (start <= total) {
    const end = Math.min(start + PAGE_LIMIT - 1, total);
    segs.push({ title: `Parte ${idx}`, page_from: start, page_to: end });
    start = end + 1;
    idx++;
  }
  return segs;
}

export function PdfSplitter({
  file,
  totalPages,
  onBack,
}: {
  file: File;
  totalPages: number;
  onBack: () => void;
}) {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>(() => defaultSegments(totalPages));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function updateSeg(idx: number, field: keyof Segment, value: string | number) {
    setSegments((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addSeg() {
    const last = segments[segments.length - 1];
    const nextFrom = last ? last.page_to + 1 : 1;
    if (nextFrom > totalPages) return;
    setSegments((prev) => [
      ...prev,
      { title: `Parte ${prev.length + 1}`, page_from: nextFrom, page_to: Math.min(nextFrom + PAGE_LIMIT - 1, totalPages) },
    ]);
  }

  function removeSeg(idx: number) {
    if (segments.length <= 1) return;
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate(): string {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (!s.title.trim()) return `La parte ${i + 1} necesita un nombre.`;
      if (s.page_from < 1 || s.page_to > totalPages) return `La parte ${i + 1} está fuera del rango (1-${totalPages}).`;
      if (s.page_from > s.page_to) return `La parte ${i + 1}: la página de inicio no puede ser mayor que la de fin.`;
      if (s.page_to - s.page_from + 1 > PAGE_LIMIT)
        return `La parte ${i + 1} tiene más de ${PAGE_LIMIT} páginas. Te recomendamos dividirla.`;
    }
    return "";
  }

  async function handleUpload() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name.replace(/\.[^.]+$/, ""));
      form.append("segments", JSON.stringify(segments));
      const res = await fetch("/api/notes/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.note?.id) {
        router.push(`/app/materias`);
      } else {
        setError(data.error ?? "Error al subir el archivo.");
      }
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Encabezado explicativo */}
      <div style={{
        background: "linear-gradient(135deg,rgba(139,92,246,.08),rgba(79,125,255,.06))",
        border: "1.5px solid rgba(139,92,246,.18)",
        borderRadius: 18, padding: "18px 20px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <span style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
            Tu apunte tiene {totalPages} páginas
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          Los apuntes muy largos dificultan la memorización. Te recomendamos dividirlo en partes de hasta {PAGE_LIMIT} páginas para que puedas estudiar cada tema por separado y aprovechar mejor las tarjetas y los simulacros.
        </p>
      </div>

      {/* Lista de segmentos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: 14, padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 12.5, color: "var(--violet)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Parte {i + 1}
              </span>
              {segments.length > 1 && (
                <button
                  onClick={() => removeSeg(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
                  aria-label="Eliminar parte"
                >×</button>
              )}
            </div>

            <input
              value={seg.title}
              onChange={(e) => updateSeg(i, "title", e.target.value)}
              placeholder={`Nombre de la parte ${i + 1}`}
              style={{
                width: "100%", padding: "8px 11px", borderRadius: 10,
                border: "1px solid var(--line)", fontSize: 13.5,
                color: "var(--ink)", background: "#faf8ff",
                outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>Páginas</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={seg.page_from}
                onChange={(e) => updateSeg(i, "page_from", Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: 64, padding: "6px 8px", borderRadius: 8,
                  border: "1px solid var(--line)", fontSize: 13,
                  color: "var(--ink)", background: "#faf8ff",
                  outline: "none", textAlign: "center",
                }}
              />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>hasta</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={seg.page_to}
                onChange={(e) => updateSeg(i, "page_to", Math.min(totalPages, parseInt(e.target.value) || 1))}
                style={{
                  width: 64, padding: "6px 8px", borderRadius: 8,
                  border: "1px solid var(--line)", fontSize: 13,
                  color: "var(--ink)", background: "#faf8ff",
                  outline: "none", textAlign: "center",
                }}
              />
              <span style={{ fontSize: 12, color: seg.page_to - seg.page_from + 1 > PAGE_LIMIT ? "#e53e3e" : "var(--muted)", marginLeft: "auto" }}>
                {seg.page_to - seg.page_from + 1 > 0 ? `${seg.page_to - seg.page_from + 1} pág.` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Agregar parte */}
      {segments[segments.length - 1]?.page_to < totalPages && (
        <button
          onClick={addSeg}
          style={{
            marginTop: 10, padding: "9px 14px", borderRadius: 12,
            background: "#f3f4fb", border: "1.5px dashed var(--line)",
            fontSize: 13, fontWeight: 600, color: "var(--violet)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agregar parte
        </button>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 12, fontSize: 13, color: "#c0392b", background: "#fff1f2", borderRadius: 10, padding: "9px 12px" }}>
          {error}
        </div>
      )}

      {/* Botones */}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          onClick={onBack}
          disabled={uploading}
          style={{
            flex: 1, padding: "11px", borderRadius: 13,
            background: "#f3f4fb", border: "none",
            fontSize: 13.5, fontWeight: 600, color: "var(--muted)", cursor: "pointer",
          }}
        >
          ← Volver
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            flex: 2, padding: "11px", borderRadius: 13,
            background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
            color: "#fff", border: "none",
            fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
            cursor: uploading ? "default" : "pointer",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? "Subiendo…" : `✓ Confirmar y subir (${segments.length} parte${segments.length !== 1 ? "s" : ""})`}
        </button>
      </div>
    </div>
  );
}
