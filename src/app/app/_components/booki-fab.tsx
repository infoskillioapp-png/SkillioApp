"use client";

import { useState } from "react";

export function BookiFab({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);

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
        </div>
        <div className="bcb">
          <div className="bubble">¡Hola {firstName}! 👋 ¿Arrancamos? Subí un apunte o retomá donde quedaste.</div>
        </div>
        <div className="bin">
          <input placeholder="Escribí tu pregunta…" />
          <button>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
