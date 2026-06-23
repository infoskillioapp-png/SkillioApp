"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PAGE_OPENERS: { match: string; msg: string; context: string }[] = [
  { match: "/app/ia/resumen",   msg: "¿Qué tema del resumen no te quedó claro? Preguntame y te lo explico con una analogía 🧠", context: "El estudiante está viendo el resumen de su apunte." },
  { match: "/app/ia/tarjetas",  msg: "¿Alguna tarjeta te confundió? Escribime el concepto y te lo desgloso.", context: "El estudiante está practicando con tarjetas de memoria." },
  { match: "/app/ia/simulacro", msg: "¿Querés entender por qué fallaste alguna pregunta? Contame cuál y la resolvemos juntos 🎯", context: "El estudiante está haciendo un simulacro de examen." },
  { match: "/app/ia",           msg: "¿Querés profundizar en algún tema de tu apunte? Estoy acá para ayudarte 📖", context: "El estudiante está en el espacio de estudio de su apunte." },
  { match: "/app/materias",     msg: "¿Cómo organizo mejor mis materias? Preguntame lo que quieras 🗂️", context: "El estudiante está organizando sus materias." },
  { match: "/app/logros",       msg: "¿Querés saber cómo subir tu racha o dominar más rápido? Te cuento el secreto 🏆", context: "El estudiante está viendo sus logros." },
  { match: "/app",              msg: "¡Hola! ¿Arrancamos? Subí un apunte o retomá donde quedaste. 🚀", context: "El estudiante está en el inicio de la app." },
];

function getPage(pathname: string) {
  return PAGE_OPENERS.find((p) => pathname.startsWith(p.match)) ?? PAGE_OPENERS[PAGE_OPENERS.length - 1];
}

type Msg = { role: "user" | "assistant"; content: string };

export function BookiFab({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const page = getPage(pathname);
  const opener = `¡Hola ${firstName}! 👋 ${page.msg}`;
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/booki-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, pageContext: page.context }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "Uy, algo salió mal. Probá de vuelta." };
          return copy;
        });
        return;
      }

      // efecto typewriter
      const full: string = data.text ?? "";
      let i = 0;
      setLoading(false);
      const iv = setInterval(() => {
        i += 3;
        const chunk = full.slice(0, i);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: chunk };
          return copy;
        });
        if (i >= full.length) clearInterval(iv);
      }, 16);
      return;
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Uy, algo salió mal. Probá de vuelta." };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <div className="bfab" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        <span className="bk">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
            <circle cx="9" cy="11" r="1.6" />
            <circle cx="15" cy="11" r="1.6" />
            <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6l-3 3v-3H5a1 1 0 0 1-1-1Z" fill="none" stroke="#fff" strokeWidth="1.6" />
          </svg>
        </span>
        Preguntale a Booki
      </div>

      <div id="bchat" className={open ? "open" : ""}>
        <div className="bch">
          <span className="bk" style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.25)", display: "grid", placeItems: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
              <circle cx="9" cy="11" r="1.6" />
              <circle cx="15" cy="11" r="1.6" />
            </svg>
          </span>
          Booki
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", padding: "2px 6px", lineHeight: 1, fontSize: 20, borderRadius: 6 }}
            aria-label="Cerrar"
          >×</button>
        </div>

        <div className="bcb" ref={bodyRef}>
          <div className="bubble booki">{opener}</div>

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "user" : "booki"}`}>
              {m.content || (m.role === "assistant" && loading && i === messages.length - 1 ? (
                <span className="btyping"><span /><span /><span /></span>
              ) : null)}
            </div>
          ))}
        </div>

        <div className="bin">
          <input
            ref={inputRef}
            placeholder="Escribí tu pregunta…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !input.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
