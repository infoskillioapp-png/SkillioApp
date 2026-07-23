// Parser del resumen en Markdown. Fuente única usada por la página del resumen,
// el espacio (/app/ia, para la navegación de temas) y el endpoint de PDF.
// El resumen viene como Markdown con un solo '# ' (título) y varios '## '
// (secciones). Cada '## ' es una sección navegable / unidad del candado free.

export type SummarySection = { heading: string; markdown: string };
export type ParsedSummary = { title: string; intro: string; sections: SummarySection[] };

export function parseSummaryMarkdown(md: string): ParsedSummary {
  const clean = (md || "").replace(/\r\n/g, "\n");
  const lines = clean.split("\n");

  let title = "";
  const introLines: string[] = [];
  const sections: SummarySection[] = [];
  let cur: SummarySection | null = null;

  for (const line of lines) {
    const h1 = /^#\s+(.+)$/.exec(line);
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h1 && !title) {
      title = h1[1].trim();
      continue;
    }
    if (h2) {
      if (cur) sections.push(cur);
      cur = { heading: h2[1].trim(), markdown: "" };
      continue;
    }
    if (cur) cur.markdown += (cur.markdown ? "\n" : "") + line;
    else introLines.push(line);
  }
  if (cur) sections.push(cur);

  sections.forEach((s) => { s.markdown = s.markdown.trim(); });
  const intro = introLines.join("\n").trim();

  // Sin '## ': tratamos todo el cuerpo como una sección única.
  if (sections.length === 0 && intro) {
    return { title, intro: "", sections: [{ heading: "Resumen", markdown: intro }] };
  }
  return { title, intro, sections };
}

// Extrae el markdown del resumen guardado en ai_outputs, tolerando las dos
// formas históricas de guardado ({markdown} directo, o anidado en {data}).
export function readSummaryMarkdown(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const c = content as { markdown?: unknown; data?: { markdown?: unknown } };
  if (typeof c.markdown === "string") return c.markdown;
  if (c.data && typeof c.data.markdown === "string") return c.data.markdown;
  return null;
}
