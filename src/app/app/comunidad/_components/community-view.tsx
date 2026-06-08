"use client";

import { useMemo, useState } from "react";
import type { PublicNote } from "@/lib/api/community";

type Props = {
  notes: PublicNote[];
  referralUrl: string;
  myReferrals: number;
  userPlan: "free" | "pro";
};

function initialsOf(name: string | null, email: string) {
  const src = name ?? email.split("@")[0];
  return src
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-AR");
}

export function CommunityView({ notes, referralUrl, myReferrals, userPlan }: Props) {
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<"recent" | "downloads">("recent");

  const filtered = useMemo(() => {
    let list = notes;
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(s) ||
          n.subject?.name.toLowerCase().includes(s) ||
          n.uploader?.full_name?.toLowerCase().includes(s),
      );
    }
    if (sort === "downloads") {
      list = [...list].sort((a, b) => b.downloads - a.downloads);
    }
    return list;
  }, [notes, search, sort]);

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyLink() {
    navigator.clipboard?.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <>
      <header className="mb-6">
        <div className="eyebrow mb-1.5">Comunidad</div>
        <h1 className="font-display font-extrabold text-4xl tracking-[-0.03em] mb-2">
          Apuntes <span className="italic text-accent">compartidos.</span>
        </h1>
        <p className="text-sm text-ink-soft">
          Lo que otros estudiantes pusieron en abierto. Guardá los que te
          sirvan y compartí los tuyos desde el tab Apuntes.
        </p>
      </header>

      {/* Referral card */}
      <section className="rounded-3xl bg-accent-softer border border-accent/25 p-6 mb-7">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-accent text-[#FBF1EF] flex items-center justify-center text-xl shrink-0">
            🎁
          </div>
          <div className="flex-1 min-w-[260px]">
            <div className="font-display font-bold text-lg">
              Invitá a un compañero
            </div>
            <p className="text-[12.5px] text-ink-soft mb-1">
              Por cada <strong className="text-ink">2 compañeros</strong> que se unen y pagan con tu link ganás{" "}
              <strong className="text-accent">
                {userPlan === "pro" ? "+150 créditos de IA" : "+200 créditos de IA"}
              </strong>.{" "}
              Llevás <strong className="text-ink">{myReferrals} referidos</strong>.
            </p>
            <p className="text-[11.5px] text-ink-softer mb-3">
              🎁 Quienes entren por tu link reciben <strong className="text-ink">+50 créditos gratis</strong> al completar su primer pago.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 px-3 py-2 rounded-full bg-paper border border-rule text-[12.5px] truncate"
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-4 py-2 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-[12.5px] hover:bg-accent-hover transition"
              >
                {copied ? "✓ Copiado" : "Copiar link"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] px-4 py-2.5 rounded-full bg-paper border border-rule">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4 text-ink-soft">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por materia, título o autor…"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          />
        </div>

        <div className="flex p-1 rounded-full border border-rule bg-paper text-[12px]">
          {(["recent", "downloads"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-full transition font-medium ${
                sort === s ? "bg-accent text-[#FBF1EF]" : "text-ink-soft hover:text-ink"
              }`}
            >
              {s === "recent" ? "Recientes" : "Más descargados"}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-rule bg-paper-warm p-12 text-center">
          <div className="text-4xl mb-3 opacity-60">🌱</div>
          <h3 className="font-display font-bold text-lg mb-1">
            Todavía no hay apuntes públicos
          </h3>
          <p className="text-sm text-ink-soft">
            Sé el primero: subí un apunte y compartilo desde el tab Apuntes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <article
              key={n.id}
              className="rounded-3xl bg-paper border border-rule-soft p-5 flex flex-col hover:border-rule transition"
            >
              {/* Header card */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full text-[#FBF1EF] font-display font-bold text-[12px] flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${n.subject?.color ?? "var(--accent)"}, var(--accent-2))`,
                  }}
                >
                  {initialsOf(n.uploader?.full_name ?? null, n.uploader?.email ?? "??")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] truncate">
                    {n.uploader?.full_name ?? (n.uploader?.email.split("@")[0] ?? "Anónimo")}
                  </div>
                  <div className="text-[11px] text-ink-soft">UBA · Ingeniería</div>
                </div>
                {n.has_ai_content && (
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                    ✨ IA
                  </span>
                )}
              </div>

              {/* Subject dot + name */}
              {n.subject && (
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink-soft mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: n.subject.color }}
                  />
                  <span>{n.subject.name}</span>
                </div>
              )}

              <h3 className="font-display font-bold text-base mb-2 line-clamp-2">
                {n.title}
              </h3>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-rule-soft">
                <div className="flex items-center gap-3 text-[11px] text-ink-soft">
                  <span title="Descargas">⬇ {n.downloads}</span>
                  <span title="Me gusta">❤ {n.likes}</span>
                  <span>{timeAgo(n.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/api/notes/${n.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-full border border-rule text-[11px] font-medium hover:border-ink-soft transition"
                  >
                    Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => toggleSave(n.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                      saved.has(n.id)
                        ? "bg-accent text-[#FBF1EF]"
                        : "border border-rule hover:border-accent hover:text-accent"
                    }`}
                  >
                    {saved.has(n.id) ? "Guardado ✓" : "Guardar"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
