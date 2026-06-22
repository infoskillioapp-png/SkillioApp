"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KIND_LABELS: Record<string, string> = {
  resumen: "Resumen",
  apunte: "Apunte",
  toma_notas: "Apuntes de clase",
  parcial: "Parcial",
  final: "Final",
  otro: "Otro",
};

const KIND_COLORS: Record<string, string> = {
  resumen: "#4f7dff",
  apunte: "#8b5cf6",
  toma_notas: "#2dd4bf",
  parcial: "#ffc93c",
  final: "#ff6b81",
  otro: "#a5b4fc",
};

type FeedItem = {
  id: string;
  title: string;
  kind: string;
  subject: string;
  university: string;
  career: string;
  year: number | null;
  likes: number;
  downloads: number;
  createdAt: string;
  authorName: string;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "hace un momento";
  if (d < 3600) return `hace ${Math.floor(d / 60)} min`;
  if (d < 86400) return `hace ${Math.floor(d / 3600)} h`;
  return `hace ${Math.floor(d / 86400)} días`;
}

export function ComunidadClient({ feed, activeKind }: { feed: FeedItem[]; activeKind: string }) {
  const router = useRouter();
  const [kind, setKind] = useState(activeKind);

  function filterKind(k: string) {
    setKind(k);
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    router.push(`/app/comunidad${p.toString() ? "?" + p.toString() : ""}`);
  }

  const SUBJECTS = [...new Set(feed.map((f) => f.subject).filter(Boolean))].slice(0, 12);

  return (
    <div className="com-wrap">
      <main>
        {/* hero inline */}
        <div className="page-hero in" style={{ background: "linear-gradient(125deg,#2dd4bf 0%,#4f7dff 50%,#8b5cf6 100%)", marginBottom: 22 }}>
          <h1>Comunidad</h1>
          <p>Apuntes, resúmenes y parciales compartidos por estudiantes. Encontrá lo que necesitás.</p>
        </div>

        {/* filtros */}
        <div className="com-filters">
          <button className={`cfil${kind === "" ? " on" : ""}`} onClick={() => filterKind("")}>
            Todos
          </button>
          {Object.entries(KIND_LABELS).map(([k, label]) => (
            <button key={k} className={`cfil${kind === k ? " on" : ""}`} onClick={() => filterKind(k)}>
              {label}
            </button>
          ))}
        </div>

        {/* feed */}
        {feed.length === 0 ? (
          <div className="com-empty">
            <div style={{ fontSize: 48, marginBottom: 14 }}>🌐</div>
            <h3 className="po" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {kind ? `No hay ${KIND_LABELS[kind] ?? kind}s compartidos` : "Todavía no hay apuntes en la comunidad"}
            </h3>
            <p style={{ fontSize: 14 }}>Sé el primero en compartir. Ayudás a otros y ganás reconocimiento. 🎓</p>
          </div>
        ) : (
          <div className="com-feed">
            {feed.map((item, i) => (
              <div key={item.id} className="com-card in" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="cc-top">
                  <div className="cc-av">{item.authorName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="cc-who">{item.authorName}</div>
                    <div className="cc-meta">
                      {item.university && `${item.university} · `}
                      {timeAgo(item.createdAt)}
                    </div>
                  </div>
                  <span className="cc-kind" style={{ background: `${KIND_COLORS[item.kind] ?? "#a5b4fc"}22`, color: KIND_COLORS[item.kind] ?? "#8b5cf6" }}>
                    {KIND_LABELS[item.kind] ?? item.kind}
                  </span>
                </div>
                <h3>{item.title}</h3>
                {item.subject && (
                  <p>
                    {item.subject}{item.career && ` · ${item.career}`}{item.year && ` · ${item.year}°`}
                  </p>
                )}
                <div className="cc-foot">
                  <span className="cc-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    {item.likes}
                  </span>
                  <span className="cc-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    {item.downloads} descargas
                  </span>
                  <button className="cc-dl">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Usar en Booki
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* aside */}
      <aside className="com-aside">
        <div className="com-aside-card">
          <h3 className="po">Compartí tu apunte</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 14 }}>
            Ayudá a otros estudiantes compartiendo tus notas. Ganarás reconocimiento en la comunidad.
          </p>
          <button className="com-share-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
            </svg>
            Compartir apunte
          </button>
        </div>
        {SUBJECTS.length > 0 && (
          <div className="com-aside-card">
            <h3 className="po">Temas populares</h3>
            <div>
              {SUBJECTS.map((s) => (
                <span key={s} className="sub-tag" onClick={() => router.push(`/app/comunidad?subject=${encodeURIComponent(s)}`)}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="com-aside-card">
          <h3 className="po">Cómo funciona</h3>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <div>📤 Subí un apunte y marcalo como público</div>
            <div>🤖 Booki genera resumen, tarjetas y simulacro</div>
            <div>🌐 La comunidad lo puede usar y mejorar</div>
            <div>⭐ Ganás puntos por cada descarga</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
