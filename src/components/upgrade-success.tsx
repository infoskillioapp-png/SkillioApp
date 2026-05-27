"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "./toast";

// Detecta ?upgraded=1 en la URL al volver de MercadoPago y muestra un toast.
export function UpgradeSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (params.get("upgraded") === "1") {
      toast.success(
        "¡Bienvenido a PRO! 🎉",
        "Tu suscripción está activa. Ahora tenés acceso completo a Skillio.",
      );
      // Limpiar el query param sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete("upgraded");
      router.replace(url.pathname + url.search);
    }
  }, [params, router, toast]);

  return null;
}
