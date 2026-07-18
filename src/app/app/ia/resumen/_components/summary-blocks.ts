// Tipos y helpers de los bloques del resumen — SIN "use client". Los necesita
// tanto el Server Component del espacio (ia/page.tsx) como el cliente del
// resumen (resumen-client.tsx); si viven en un archivo "use client", Next.js
// rompe al importarlos desde un Server Component (el bug real de este cambio).

// Formato viejo (y el que sigue usando free): un párrafo + nada más. Sigue
// existiendo para no romper resúmenes ya generados ni el free (alcance actual:
// solo pro tiene los bloques dinámicos de abajo).
export type LegacyPoint = { emoji?: string; title: string; description: string; category?: string };

// Bloques dinámicos de pro: la IA elige, por bloque, el formato que mejor
// comunique ESE contenido puntual — no todo es "texto + lista".
export type TextoBlock = { type: "texto"; emoji?: string; title: string; category?: string; body: string };
export type ProcesoBlock = {
  type: "proceso"; emoji?: string; title: string; category?: string; intro?: string;
  pasos: { paso: string; detalle: string }[];
};
export type TablaBlock = {
  type: "tabla"; emoji?: string; title: string; category?: string; intro?: string;
  columnas: string[]; filas: { etiqueta: string; valores: string[] }[];
};
export type FrameworkBlock = {
  type: "framework"; emoji?: string; title: string; category?: string; intro?: string;
  elementos: { nombre: string; descripcion: string }[];
};
export type AnalogiaBlock = { type: "analogia"; emoji?: string; title: string; category?: string; analogia: string; conexion: string };

export type SummaryPoint = LegacyPoint | TextoBlock | ProcesoBlock | TablaBlock | FrameworkBlock | AnalogiaBlock;

export type BlockKind = "legacy" | "texto" | "proceso" | "tabla" | "framework" | "analogia";
export function blockKind(p: SummaryPoint): BlockKind {
  return "type" in p ? p.type : "legacy";
}

// Versión en texto plano de cualquier bloque — para el tip de Booki, la
// práctica rápida y el modo "explicalo como a un niño" (no necesitan la
// estructura, solo el contenido).
export function plainText(p: SummaryPoint): string {
  switch (blockKind(p)) {
    case "legacy": return (p as LegacyPoint).description;
    case "texto": return (p as TextoBlock).body;
    case "proceso": {
      const b = p as ProcesoBlock;
      return [b.intro, ...b.pasos.map((s, i) => `${i + 1}. ${s.paso}: ${s.detalle}`)].filter(Boolean).join(" ");
    }
    case "tabla": {
      const b = p as TablaBlock;
      return [b.intro, ...b.filas.map((f) => `${f.etiqueta}: ${f.valores.join(", ")}`)].filter(Boolean).join(" ");
    }
    case "framework": {
      const b = p as FrameworkBlock;
      return [b.intro, ...b.elementos.map((e) => `${e.nombre}: ${e.descripcion}`)].filter(Boolean).join(" ");
    }
    case "analogia": {
      const b = p as AnalogiaBlock;
      return `${b.analogia} ${b.conexion}`;
    }
  }
}

export type SummarySection = {
  name: string;
  points: SummaryPoint[];
};
