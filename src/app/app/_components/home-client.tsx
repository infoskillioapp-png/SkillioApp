"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UploadModal } from "./upload-modal";
import { MateriasAccordion } from "./materias-accordion";

function useParallaxBg() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 14;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      ref.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return ref;
}

function Topbar({ name, initial }: { name: string; initial: string }) {
  return (
    <div className="topbar in">
      <div className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input placeholder="Buscá un apunte, tema o materia…" />
      </div>
      <div className="tbtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="tbtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div className="profile">
        <span>{name}</span>
        <span className="pa">{initial}</span>
      </div>
    </div>
  );
}

// Incluye el ring SVG + el texto porcentaje adentro del bigring
function ContinuarRing({ pct }: { pct: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const [displayPct, setDisplayPct] = useState(0);
  const circumference = 2 * Math.PI * 40;

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference);
    setDisplayPct(0);

    const timer = setTimeout(() => {
      ring.style.transition = "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)";
      ring.style.strokeDashoffset = String(circumference - (pct / 100) * circumference);
      const start = performance.now();
      const dur = 1100;
      function tick(now: number) {
        const p = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setDisplayPct(Math.round(pct * e));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 400);

    return () => clearTimeout(timer);
  }, [pct, circumference]);

  return (
    <div className="bigring">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="9" />
        <circle
          ref={ringRef}
          cx="48" cy="48" r="40" fill="none"
          stroke="url(#cgHome)" strokeWidth="9" strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <defs>
          <linearGradient id="cgHome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4f7dff" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ctr">
        <b>{displayPct}%</b>
        <span>Dominio</span>
      </div>
    </div>
  );
}

type Props = {
  user: { firstName: string; initial: string };
  lastNote: { id: string; subjectName: string; title: string; dominio: number } | null;
  subjects: { id: string; name: string; color: string }[];
  notes: { id: string; subject_id: string | null; title: string; has_ai_content: boolean }[];
  autoUpload?: boolean;
};

export function HomeClient({ user, lastNote, subjects, notes, autoUpload = false }: Props) {
  const [modalOpen, setModalOpen] = useState(autoUpload);
  const bgRef = useParallaxBg();

  // Reaccionar si el prop cambia (e.g., sidebar navega a /app?upload=1 estando ya en /app)
  useEffect(() => {
    if (autoUpload) setModalOpen(true);
  }, [autoUpload]);
  const [localDominio, setLocalDominio] = useState<number | null>(null);

  useEffect(() => {
    if (!lastNote) return;
    const stored = localStorage.getItem(`skillio_dominio_${lastNote.id}`);
    if (stored !== null) setLocalDominio(parseInt(stored, 10));
  }, [lastNote]);

  return (
    <>
      <div ref={bgRef} style={{ position: "fixed", inset: "-22% 0", zIndex: -1, background: "url('/fondohome.jpeg') center center/cover no-repeat", willChange: "transform", transition: "transform 0.12s ease-out" }} />

      <div className="app">
        <main>
          <Topbar name={user.firstName} initial={user.initial} />

          <div className="grid-top">
            <section className="hero in" style={{ animationDelay: ".05s" }}>
              <div className="htx">
                <h1>Subí tu apunte y estudiá en minutos</h1>
                <p>Booki te arma el resumen, las tarjetas y el simulacro. Vos solo concentrate en aprender. 🚀</p>
                <button className="upload" onClick={() => setModalOpen(true)}>
                  <span className="ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </span>
                  Subir archivo
                </button>
              </div>
              <div className="hero-booki">
                <Image
                  src="/booki_home.png" alt="Booki"
                  width={320} height={400}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 14%",
                    WebkitMaskImage: "radial-gradient(72% 78% at 62% 40%, #000 48%, transparent 76%)",
                    maskImage: "radial-gradient(72% 78% at 62% 40%, #000 48%, transparent 76%)",
                    animation: "bookiFloat 4.4s ease-in-out infinite" }}
                />
              </div>
            </section>

            <Link href={lastNote ? `/app/ia?note_id=${lastNote.id}` : "/app/ia"} className="continue in" style={{ animationDelay: ".12s" }}>
              <div className="eyebrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Continuá donde quedaste
              </div>
              <div className="body">
                <ContinuarRing pct={localDominio ?? lastNote?.dominio ?? 0} />
                <div className="info">
                  <div className="mat">{lastNote?.subjectName ?? "Sin materias aún"}</div>
                  <div className="tema">{lastNote ? `${lastNote.title} · En progreso` : "Subí tu primer apunte"}</div>
                  {lastNote && (
                    <div className="chips">
                      <span className="chx dom">Continuar</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="retomar">
                Retomar estudio
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </Link>
          </div>

          <div className="sec-h in" style={{ animationDelay: ".18s" }}>
            <div>
              <h2>Mis materias</h2>
              <p>Tus apuntes ordenados por materia. Tocá una y seguí sumando dominio.</p>
            </div>
            <Link href="/app/materias" className="all">Ver todas →</Link>
          </div>

          <div className="in" style={{ animationDelay: ".22s" }}>
            <MateriasAccordion subjects={subjects} notes={notes} onUpload={() => setModalOpen(true)} />
          </div>

          <Link href="/app/materias" className="add-materia">
            <span className="plus">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            Crear nueva materia
          </Link>
        </main>
      </div>

      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} subjects={subjects} />
    </>
  );
}
