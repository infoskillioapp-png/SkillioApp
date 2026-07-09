"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "./toast";

// Detecta ?registered=1 (lo setea el onboarding al terminar el alta) y:
//  1) muestra un toast de bienvenida,
//  2) limpia el query param para que no se vuelva a disparar.
//
// Ya NO dispara CompleteRegistration al Pixel: la señal real de intención es la
// ACTIVACIÓN (primera generación con material propio), que se mide server-side
// por CAPI en markActivationIfFirst. El registro dejó de ser el paso relevante
// del embudo (registro diferido).
export function RegistrationSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (params.get("registered") !== "1") return;

    toast.success(
      "¡Bienvenido a Skillio! 🎉",
      "Subí tu primer apunte y dejá que la IA te lo resuma en segundos.",
    );

    const url = new URL(window.location.href);
    url.searchParams.delete("registered");
    router.replace(url.pathname + url.search);
  }, [params, router, toast]);

  return null;
}
