import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compone clases de Tailwind resolviendo conflictos.
 * Uso: cn("p-2 bg-paper", isActive && "bg-accent text-paper")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
