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

// Embudo público (registro diferido): subir apunte + generar resumen sin cuenta.
// Estos endpoints resuelven la identidad por dentro (Clerk o sesión anónima),
// así que quedan fuera de auth.protect(). El resto de /api/notes y /api/ai sigue
// protegido igual que antes.
const isPublicFunnelRoute = createRouteMatcher([
  "/api/notes/upload",
  "/api/notes/pdf-info",
  "/api/ai/summarize",
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
