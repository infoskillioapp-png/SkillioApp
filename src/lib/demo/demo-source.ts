// =============================================================================
// DEMO · Apunte base del onboarding guiado
//
//   👉 PARA EMILIANO: para cambiar el material del demo, editá SOLO este archivo.
//   1. Reemplazá DEMO.text por el texto del apunte que quieras usar.
//   2. (Opcional) Subí el PDF a `public/demo/apunte-demo.pdf` y dejá
//      `pdfUrl: "/demo/apunte-demo.pdf"`. Si no hay PDF, el botón "Ver apunte
//      completo" muestra el texto de abajo formateado como documento.
//
// El demo genera resumen + simulacro REALES con Claude Haiku a partir de
// `DEMO.text` (no contenido hardcodeado), pero NO descuenta créditos ni las 3
// generaciones gratis del trial (los endpoints viven en /api/demo/*).
// =============================================================================

export const DEMO = {
  /** Título que ve el usuario (y filename para la IA). */
  title: "Revolución de Mayo de 1810",
  fileName: "apunte-revolucion-de-mayo.pdf",

  /** Ruta a un PDF real en /public. Dejar null para usar el visor de texto. */
  pdfUrl: null as string | null,

  /** Materia/etiqueta mostrada como contexto. */
  subject: "Historia Argentina · Ingreso universitario",

  /**
   * Texto del apunte. La IA genera el resumen y el simulacro sobre ESTE texto.
   * Mantenelo autocontenido y factual (mejor para un simulacro de 3 preguntas).
   */
  text: `LA REVOLUCIÓN DE MAYO DE 1810

CONTEXTO INTERNACIONAL
En 1808 Napoleón Bonaparte invadió España y tomó prisionero al rey Fernando VII, colocando en el trono a su hermano José Bonaparte. Esto generó un vacío de poder en España y en todas sus colonias americanas. En el Virreinato del Río de la Plata, la noticia llegó en mayo de 1810 a través de barcos ingleses, y puso en duda la legitimidad del virrey Baltasar Hidalgo de Cisneros, ya que había sido nombrado por una autoridad española que ya no existía.

LA SEMANA DE MAYO
Entre el 18 y el 25 de mayo de 1810 se sucedieron una serie de hechos conocidos como la Semana de Mayo. Los criollos, encabezados por figuras como Cornelio Saavedra, Manuel Belgrano, Juan José Castelli y Mariano Moreno, exigieron la realización de un Cabildo Abierto para decidir el futuro del gobierno.

EL CABILDO ABIERTO DEL 22 DE MAYO
El 22 de mayo se realizó un Cabildo Abierto, una asamblea de vecinos notables. El debate central fue si el virrey Cisneros debía continuar en el poder. Castelli y Saavedra sostuvieron que, al haber caducado la autoridad que lo había nombrado, el pueblo tenía derecho a reasumir su soberanía y formar un nuevo gobierno. Esta idea se conoce como la teoría de la retroversión de la soberanía a los pueblos.

LA PRIMERA JUNTA
El 25 de mayo de 1810, tras el rechazo popular a una junta presidida por el propio Cisneros, se formó la Primera Junta de Gobierno. Estuvo presidida por Cornelio Saavedra e integrada, entre otros, por Mariano Moreno y Juan José Paso como secretarios, y vocales como Manuel Belgrano, Juan José Castelli, Domingo Matheu y Manuel Alberti. La Junta gobernó en nombre de Fernando VII (la llamada "máscara de Fernando"), una estrategia política para no declarar abiertamente la independencia.

CONSECUENCIAS
La Revolución de Mayo no declaró la independencia (eso ocurrió recién el 9 de julio de 1816), pero marcó el primer gobierno patrio y el inicio del proceso que llevaría a la emancipación. Mariano Moreno impulsó medidas revolucionarias y fundó la Gazeta de Buenos Aires para difundir las ideas del nuevo gobierno. Las tensiones entre Saavedra (más moderado) y Moreno (más radical) marcarían la política de los años siguientes.`,
} as const;

export type DemoSource = typeof DEMO;
