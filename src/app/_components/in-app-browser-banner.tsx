"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track-client";

type App = "instagram" | "facebook" | "tiktok";

function detectInAppBrowser(): App | null {
  const ua = navigator.userAgent || "";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "tiktok";
  return null;
}

const LABEL: Record<App, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

/**
 * Google bloquea el login OAuth dentro de navegadores embebidos (el "in-app
 * browser" de Instagram/Facebook/TikTok) — el usuario toca "Continuar con
 * Google" y no pasa nada, o le tira error. Este banner detecta esos casos y le
 * da una salida: en Android, un botón que fuerza abrir en Chrome; en iOS (donde
 * no se puede forzar), instrucciones claras.
 */
export function InAppBrowserBanner() {
  const [app, setApp] = useState<App | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const detected = detectInAppBrowser();
    setApp(detected);
    setIsAndroid(/Android/i.test(navigator.userAgent));
    if (detected) track("in_app_browser_detectado", detected);
  }, []);

  if (!app) return null;

  function openInChrome() {
    track("in_app_browser_abrir_chrome_click", app!);
    const bare = window.location.href.replace(/^https?:\/\//, "");
    window.location.href = `intent://${bare}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        marginBottom: 20,
        borderRadius: 14,
        background: "#fff7ed",
        border: "1px solid #fed7aa",
      }}
    >
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "#7c2d12", margin: 0 }}>
        <strong>Estás entrando desde {LABEL[app]}.</strong> Google no permite iniciar sesión desde
        acá — abrí este link en tu navegador para poder registrarte.
      </p>
      {isAndroid ? (
        <button
          onClick={openInChrome}
          style={{
            alignSelf: "flex-start",
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            background: "#9655E5",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Abrir en Chrome
        </button>
      ) : (
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#9a3412", margin: 0 }}>
          Tocá el ícono <strong>⋯</strong> o <strong>⋰</strong> (arriba, a la derecha) y elegí{" "}
          <strong>&quot;Abrir en el navegador&quot;</strong> o <strong>&quot;Abrir en Safari&quot;</strong>.
        </p>
      )}
    </div>
  );
}
