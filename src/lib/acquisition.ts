import "server-only";
import { cookies } from "next/headers";

/**
 * Lee la cookie de UTMs de primer toque (la setea <UtmCapture/> en la app y el
 * script de la landing estática public/lp) para saber de qué anuncio vino la
 * persona. Devuelve null si no vino de un anuncio con UTMs. Nunca lanza.
 */
export async function readAcquisition(): Promise<Record<string, string> | null> {
  try {
    const raw = (await cookies()).get("skillio_utm")?.value;
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
