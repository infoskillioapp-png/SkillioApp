"use client";

import { useEffect } from "react";

// Captura las UTMs de la URL (de qué ángulo/creativo vino el usuario) y las
// guarda en una cookie de first-touch que SOBREVIVE el redirect de Clerk durante
// el signup. syncUserToSupabase la lee al crear la fila y la persiste en
// users.acquisition. Atribución de primer toque: no se pisa si ya existe.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const COOKIE = "skillio_utm";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function hasCookie(name: string): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
}

export function UtmCapture() {
  useEffect(() => {
    try {
      // First-touch: si ya capturamos, no pisamos.
      if (hasCookie(COOKIE)) return;

      const params = new URLSearchParams(window.location.search);
      const acquisition: Record<string, string> = {};
      for (const k of UTM_KEYS) {
        const v = params.get(k);
        if (v) acquisition[k] = v.slice(0, 200);
      }

      // Solo guardamos si vino con al menos una UTM (tráfico de anuncios).
      if (Object.keys(acquisition).length === 0) return;

      acquisition.landing_path = window.location.pathname.slice(0, 200);
      if (document.referrer) acquisition.referrer = document.referrer.slice(0, 200);

      const value = encodeURIComponent(JSON.stringify(acquisition));
      document.cookie = `${COOKIE}=${value}; max-age=${MAX_AGE}; path=/; samesite=lax`;
    } catch {
      /* nunca rompe la página */
    }
  }, []);

  return null;
}
