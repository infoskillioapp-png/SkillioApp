"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "./toast";

// Detecta ?registered=1 (lo setea completeOnboarding al terminar el alta) y:
//  1) dispara el evento de Registro al Pixel de Meta (CompleteRegistration),
//  2) muestra un toast de bienvenida,
//  3) limpia el query param para que no se vuelva a disparar.
export function RegistrationSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (params.get("registered") !== "1") return;

    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (fbq) fbq("track", "CompleteRegistration");

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
