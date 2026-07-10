import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/admin(.*)",
  "/api/me(.*)",
  "/api/agenda(.*)",
  "/api/subjects(.*)",
  "/api/pomodoro(.*)",
  "/api/notes(.*)",
  "/api/ai(.*)",
]);

// Embudo público (registro diferido): subir apunte + generar resumen + ver el
// resultado, todo SIN cuenta. Estos endpoints y pantallas resuelven la identidad
// por dentro (Clerk o sesión anónima), así que quedan fuera de auth.protect().
//   - APIs: subir, pdf-info, generar resumen.
//   - Pantallas dentro de /app: la home (donde el invitado sube) y la vista de
//     resultado. El resto de /app/* sigue protegido (materias, logros, comunidad,
//     perfil, etc.): al invitado lo rebota a /login.
const isPublicFunnelRoute = createRouteMatcher([
  "/api/notes/upload",
  "/api/notes/pdf-info",
  "/api/ai/summarize",
  "/app",
  "/app/ia/resumen",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isPublicFunnelRoute(req)) {
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
