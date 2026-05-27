"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            gap: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Algo salió mal</h2>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 999,
              background: "#A5402D",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
