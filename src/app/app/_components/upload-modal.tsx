"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PdfSplitter } from "./pdf-splitter";
import { DEMO_TOPICS } from "@/lib/demo-content";
import type { DemoTopic } from "@/lib/demo-content";
import { track } from "@/lib/track-client";

const PDF_PAGE_LIMIT = 30;

type Tab = "file" | "text" | "yt" | "drive";

export function UploadModal({
  open,
  onClose,
  isGuest = false,
}: {
  open: boolean;
  onClose: () => void;
  isGuest?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("file");
  const [dragging, setDragging] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState<string | null>(null);
  const [splitterFile, setSplitterFile] = useState<File | null>(null);
  const [splitterPages, setSplitterPages] = useState(0);
  const [demoLoading, setDemoLoading] = useState<DemoTopic | null>(null);
  const [demoPct, setDemoPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Invitado (registro diferido): no hay /app/ia (requiere cuenta) — generamos
  // acá mismo y vamos directo al resultado.
  async function generateAndGoToResult(noteId: string) {
    setGeneratingMsg("Generando tu resumen…");
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_id: noteId, format: "puntos_clave" }),
      });
      if (res.ok) {
        onClose();
        router.push(`/app/ia/resumen?note_id=${noteId}`);
        return;
      }
    } catch {
      /* cae al finally */
    }
    setGeneratingMsg(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function uploadFile(file: File) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setUploading(true);
      try {
        const buf = await file.arrayBuffer();
        const res = await fetch("/api/notes/pdf-info", { method: "POST", body: buf });
        if (res.ok) {
          const { pages } = await res.json();
          if (pages > PDF_PAGE_LIMIT) {
            setSplitterFile(file);
            setSplitterPages(pages);
            return;
          }
        }
      } finally {
        setUploading(false);
      }
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/notes/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.note?.id) {
        if (isGuest) {
          setUploading(false);
          await generateAndGoToResult(data.note.id);
          return;
        }
        onClose();
        router.push(`/app/ia?note_id=${data.note.id}&gen=1`);
      }
    } finally {
      setUploading(false);
    }
  }

  async function startDemo(topic: DemoTopic) {
    setDemoLoading(topic);
    setDemoPct(0);
    // Funnel: probó un apunte demo (no cuenta como activación — la activación es
    // solo con material propio vía IA).
    track("demo_apunte_abierto", topic);
    // Animación de carga falsa: 0→95 en ~1.8s, luego navega
    const steps = [15, 30, 52, 71, 88, 95];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setDemoPct(steps[i]);
    }
    await new Promise((r) => setTimeout(r, 400));
    setDemoLoading(null);
    onClose();
    // Invitado: /app/ia (el "espacio" completo) requiere cuenta — el demo va
    // directo al resumen, que ya es compatible con invitados.
    router.push(
      isGuest ? `/app/ia/resumen?note_id=demo-${topic}` : `/app/ia?note_id=demo-${topic}`,
    );
  }

  async function uploadText() {
    if (!textInput.trim()) return;
    setUploading(true);
    try {
      const blob = new Blob([textInput], { type: "text/plain" });
      const file = new File([blob], "texto.txt", { type: "text/plain" });
      const form = new FormData();
      form.append("file", file);
      form.append("title", textInput.slice(0, 60));
      const res = await fetch("/api/notes/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.note?.id) {
        if (isGuest) {
          setUploading(false);
          await generateAndGoToResult(data.note.id);
          return;
        }
        onClose();
        router.push(`/app/ia?note_id=${data.note.id}&gen=1`);
      }
    } finally {
      setUploading(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "file", label: "Subir archivo", icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
      ),
    },
    {
      id: "text", label: "Texto", icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      ),
    },
    {
      id: "yt", label: "YouTube Video", icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: "drive", label: "Google Drive", icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 19h12a3 3 0 0 0 0-6 5 5 0 0 0-9.6-1.3A3.5 3.5 0 0 0 6 19z" />
        </svg>
      ),
    },
  ];

  if (!open) return null;

  return (
    <>
    <div
      id="upModal"
      className="show"
      onClick={(e) => { if (e.target === e.currentTarget) { setSplitterFile(null); onClose(); } }}
    >
      <div className="um-card">
        <div className="um-head">
          <h3>{splitterFile ? "Dividir apunte" : "Creá tu estudio desde:"}</h3>
          <button className="um-x" onClick={() => { setSplitterFile(null); onClose(); }} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Vista divisor de PDF */}
        {splitterFile && (
          <div style={{ padding: "0 4px 4px" }}>
            <PdfSplitter
              file={splitterFile}
              totalPages={splitterPages}
              onBack={() => setSplitterFile(null)}
            />
          </div>
        )}

        {/* Vista normal */}
        {!splitterFile && <>
        <div className="um-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`um-tab${tab === t.id ? " on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "file" && (
          <div className="um-pane on">
            <div
              className={`um-drop${dragging ? " drag" : ""}`}
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
            >
              <Image src="/bookisubirarchivocorrecto.png" alt="Booki con un documento" width={340} height={240} style={{ width: 340, height: "auto", margin: "0 auto", display: "block", filter: "drop-shadow(0 12px 18px rgba(80,40,150,.28))" }} />
              <div className="um-arrow">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12M6 12l6 6 6-6" />
                </svg>
              </div>
              <h4>Arrastrá y soltá tus archivos acá</h4>
              <div className="types">Formatos: PDF · Word · PPT · TXT · JPG · PNG · HEIC · WebP · MP3 · WAV · M4A</div>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.heic,.webp,.mp3,.wav,.m4a" />
              <button data-tour="um-pick" className="um-pick" onClick={() => fileRef.current?.click()} disabled={uploading || !!generatingMsg}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                {generatingMsg ? generatingMsg : uploading ? "Subiendo…" : "Seleccionar archivo"}
              </button>
              {/* Demo pills */}
              {demoLoading ? (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                    Generando tu set de estudio… <b>{demoPct}%</b>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "#eceefb", overflow: "hidden", maxWidth: 260, margin: "0 auto" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#8b5cf6,#4f7dff)", width: `${demoPct}%`, transition: "width .3s ease" }} />
                  </div>
                </div>
              ) : (
                <div data-tour="demo-pills" style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, textAlign: "center" }}>
                    ¿No tenés un apunte a mano? Probá con uno nuestro:
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
                    {DEMO_TOPICS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => startDemo(t.id)}
                        style={{
                          padding: "6px 13px", borderRadius: 99,
                          background: "rgba(139,92,246,.08)",
                          border: "1px solid rgba(139,92,246,.2)",
                          color: "var(--ink)", fontSize: 12, fontWeight: 500,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,.16)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,92,246,.08)")}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "text" && (
          <div className="um-pane on">
            <textarea className="um-ta" placeholder="Pegá acá tu texto, apuntes o lo que quieras estudiar…" value={textInput} onChange={(e) => setTextInput(e.target.value)} />
            <div className="um-row" style={{ justifyContent: "flex-end" }}>
              <button className="um-pick" onClick={uploadText} disabled={uploading || !!generatingMsg || !textInput.trim()}>{generatingMsg ?? (uploading ? "Subiendo…" : "Crear estudio")}</button>
            </div>
          </div>
        )}

        {tab === "yt" && (
          <div className="um-pane on">
            <div className="um-soft" style={{ padding: "16px 0 4px" }}>Pegá el enlace de un video y Booki lo convierte en tu set de estudio.</div>
            <input className="um-input" placeholder="https://www.youtube.com/watch?v=…" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} />
            <div className="um-row" style={{ justifyContent: "flex-end" }}>
              <button className="um-pick" disabled>{uploading ? "Subiendo…" : "Crear estudio"}</button>
            </div>
          </div>
        )}

        {tab === "drive" && (
          <div className="um-pane on">
            <div className="um-soft">
              <span className="em">📁</span>
              Conectá tu Google Drive para importar documentos directamente.<br />
              <span style={{ fontSize: 12 }}>Próximamente</span>
            </div>
            <div className="um-row" style={{ justifyContent: "center" }}>
              <button className="um-pick" style={{ opacity: .55, cursor: "default" }}>Conectar Google Drive</button>
            </div>
          </div>
        )}

        <div className="um-foot">Cada set puede incluir hasta 10 fuentes.</div>
        </>}
      </div>

    </div>
    </>
  );
}
