import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Registro diferido: el invitado (sesión anónima) es un usuario FREE completo —
// puede ver toda la app (/app/*) y usar las herramientas de estudio (subir,
// generar resumen/tarjetas/simulacro, etc.), lo único que no puede es
// desbloquear (pagar). Por eso NO protegemos /app ni las APIs del free: cada
// página y endpoint resuelve la identidad por dentro (Clerk o cookie anónima) y
// aplica el gate de free. Sólo el admin y los endpoints de cuenta (/api/me)
// siguen siendo Clerk-only.
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/me(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Saltea internals de Next y archivos estaticos
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre corre en API y trpc
    "/(api|trpc)(.*)",
  ],
};
