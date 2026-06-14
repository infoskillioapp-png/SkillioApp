// =============================================================================
// DEMO · Apunte base del onboarding guiado
//
//   👉 PARA EMILIANO: para cambiar el material del demo:
//   1. Subí el PDF a `public/` y poné su nombre EXACTO en `pdfPublicPath`
//      (ojo con mayúsculas: Vercel/Linux distingue mayúsculas de minúsculas).
//   2. Actualizá `title` y `subject` a lo que quieras mostrar.
//   3. El demo genera resumen + simulacro REALES con Claude Haiku leyendo ese
//      PDF directamente (igual que la app). `text` es solo un fallback por si el
//      PDF no se pudiera leer.
//
// Estas generaciones NO descuentan créditos ni las 3 gratis del trial.
// =============================================================================

export const DEMO = {
  /** Título que ve el usuario. */
  title: "Métodos de estudio · Unidad 2",
  /** Nombre de archivo (para la IA y la descarga). */
  fileName: "Metodos_de_Estudio_Unidad_2.pdf",

  /** Ruta pública del PDF (para "Ver apunte completo" → abre el PDF real). */
  pdfUrl: "/Metodos_de_Estudio_Unidad_2.pdf" as string | null,
  /** Nombre del archivo dentro de /public (para que el server lo lea y se lo pase a la IA). */
  pdfPublicPath: "Metodos_de_Estudio_Unidad_2.pdf",

  /** Materia/etiqueta mostrada como contexto. */
  subject: "Técnicas y hábitos de estudio",

  /**
   * Fallback de texto SOLO si el PDF no se puede leer (no debería pasar). La
   * generación real usa el PDF de arriba.
   */
  text: `MÉTODOS DE ESTUDIO

Los métodos de estudio son técnicas y estrategias que ayudan a aprender de forma más eficiente: organizar el material, comprenderlo, retenerlo y poder recuperarlo en un examen. Entre los más efectivos están la repetición espaciada (repasar en intervalos crecientes), la práctica de recuperación activa (intentar recordar sin mirar el material), los resúmenes y mapas conceptuales, la técnica Pomodoro para gestionar el tiempo y la enseñanza a otros para fijar lo aprendido.`,
} as const;

export type DemoSource = typeof DEMO;
