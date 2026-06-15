"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refresca los datos del panel cada N segundos (router.refresh re-ejecuta los
// server components sin recargar la página entera). Así se siente "en vivo".
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
