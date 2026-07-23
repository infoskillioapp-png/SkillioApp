import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseSummaryMarkdown, readSummaryMarkdown } from "@/lib/notes/summary-markdown";

export const runtime = "nodejs";

// Genera el PDF del resumen a partir del MISMO markdown ya generado por la IA.
// Es una plantilla determinística (cero IA, cero costo). Marca Skillio.

const BRAND = "#6d28d9";
const INK = "#1f2347";

const styles = StyleSheet.create({
  page: { paddingTop: 62, paddingBottom: 54, paddingHorizontal: 48, fontSize: 10.5, fontFamily: "Helvetica", color: INK, lineHeight: 1.5 },
  // Header fijo: absoluto para que NO ocupe lugar en el flujo (si no, empuja el
  // contenido y descoloca el pie de pagina). El paddingTop del page lo despeja.
  brandRow: { position: "absolute", top: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: BRAND },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BRAND },
  brandTag: { fontSize: 9, color: "#6b7280" },
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 12 },
  h2: { fontSize: 13.5, fontFamily: "Helvetica-Bold", color: BRAND, marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: "#e6e0f5" },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: INK, marginTop: 9, marginBottom: 4 },
  p: { marginBottom: 6 },
  liRow: { flexDirection: "row", marginBottom: 4, paddingLeft: 4 },
  liBullet: { width: 12, color: BRAND },
  liText: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 6, marginBottom: 10, borderWidth: 1, borderColor: "#d9d2ee", borderRadius: 2 },
  tr: { flexDirection: "row" },
  th: { flex: 1, padding: 5, fontSize: 9.5, fontFamily: "Helvetica-Bold", backgroundColor: "#f1ecfb", borderRightWidth: 1, borderRightColor: "#d9d2ee", borderBottomWidth: 1, borderBottomColor: "#d9d2ee" },
  td: { flex: 1, padding: 5, fontSize: 9.5, borderRightWidth: 1, borderRightColor: "#eee", borderBottomWidth: 1, borderBottomColor: "#eee" },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9aa0b4" },
});

type Block =
  | { t: "h3"; text: string }
  | { t: "p"; text: string }
  | { t: "li"; text: string }
  | { t: "table"; rows: string[][] };

function mdToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let table: string[][] = [];
  const flushPara = () => { if (para.length) { blocks.push({ t: "p", text: para.join(" ") }); para = []; } };
  const flushTable = () => {
    if (table.length) {
      const rows = table.filter((r) => !r.every((c) => /^:?-+:?$/.test(c.trim())));
      if (rows.length) blocks.push({ t: "table", rows });
      table = [];
    }
  };
  for (const raw of md.split("\n")) {
    const t = raw.trim();
    if (!t) { flushPara(); flushTable(); continue; }
    if (t.startsWith("|")) {
      flushPara();
      table.push(t.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    const h3 = /^###\s+(.+)/.exec(t);
    if (h3) { flushPara(); blocks.push({ t: "h3", text: h3[1] }); continue; }
    const li = /^[-*]\s+(.+)/.exec(t);
    if (li) { flushPara(); blocks.push({ t: "li", text: li[1] }); continue; }
    para.push(t);
  }
  flushPara();
  flushTable();
  return blocks;
}

// @react-pdf usa Helvetica, que SOLO tiene glifos Latin-1 (WinAnsi). Los
// símbolos matemáticos unicode (Σ, ≤, ≥, √, ∞, griegas, flechas) NO existen en
// esa fuente y salen como glifos rotos. Por eso convertimos LaTeX a texto que
// Helvetica sí puede dibujar: los pocos símbolos válidos (× · ± ÷) se mantienen,
// el resto pasa a ASCII legible (<=, >=, sqrt, sum, pi, ...). Se lee, aunque no
// queda tipografiado como en pantalla (donde KaTeX lo hace perfecto).
function latexToText(m: string): string {
  return m
    .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)")
    .replace(/\\sum(_\{([^{}]*)\})?(\^\{([^{}]*)\})?/g, (_x, _a, lo, _b, hi) => (lo || hi ? `sum(${lo || ""}${hi ? "..." + hi : ""})` : "sum"))
    .replace(/\\prod(_\{[^{}]*\})?(\^\{[^{}]*\})?/g, "prod")
    .replace(/\\int(_\{[^{}]*\})?(\^\{[^{}]*\})?/g, "int")
    .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\div/g, "÷").replace(/\\pm/g, "±")
    .replace(/\\leq?/g, "<=").replace(/\\geq?/g, ">=").replace(/\\neq/g, "!=").replace(/\\approx/g, "~=")
    .replace(/\\infty/g, "inf")
    .replace(/\\(rightarrow|to)/g, " -> ").replace(/\\Rightarrow/g, " => ")
    .replace(/\\alpha/g, "alpha").replace(/\\beta/g, "beta").replace(/\\gamma/g, "gamma")
    .replace(/\\delta/g, "delta").replace(/\\Delta/g, "Delta").replace(/\\theta/g, "theta")
    .replace(/\\lambda/g, "lambda").replace(/\\mu/g, "mu").replace(/\\pi/g, "pi")
    .replace(/\\sigma/g, "sigma").replace(/\\phi/g, "phi").replace(/\\omega/g, "omega")
    .replace(/([_^])\{([^{}]*)\}/g, "$1$2")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}\\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function convertMath(s: string): string {
  return s
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => latexToText(m))
    .replace(/\$([^$]+)\$/g, (_, m) => latexToText(m));
}

// Limpia markdown inline que no renderizamos (fórmulas LaTeX, italics, backticks).
// La negrita se maneja aparte en <Inline>.
function clean(s: string): string {
  return convertMath(s).replace(/`/g, "").replace(/(^|[^*])\*(?!\*)([^*]+)\*(?!\*)/g, "$1$2");
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return (
    <>
      {parts.map((p, i) => {
        const b = /^\*\*([^*]+)\*\*$/.exec(p);
        return b
          ? <Text key={i} style={styles.bold}>{clean(b[1])}</Text>
          : <Text key={i}>{clean(p)}</Text>;
      })}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.t === "h3") return <Text style={styles.h3} minPresenceAhead={40}>{clean(b.text)}</Text>;
  if (b.t === "p") return <Text style={styles.p}><Inline text={b.text} /></Text>;
  if (b.t === "li")
    return (
      <View style={styles.liRow}>
        <Text style={styles.liBullet}>•</Text>
        <Text style={styles.liText}><Inline text={b.text} /></Text>
      </View>
    );
  // tabla
  const [head, ...body] = b.rows;
  return (
    <View style={styles.table}>
      {head && (
        <View style={styles.tr}>
          {head.map((c, i) => <Text key={i} style={styles.th}><Inline text={c} /></Text>)}
        </View>
      )}
      {body.map((row, ri) => (
        <View key={ri} style={styles.tr}>
          {row.map((c, ci) => <Text key={ci} style={styles.td}><Inline text={c} /></Text>)}
        </View>
      ))}
    </View>
  );
}

function ResumenPdf({ title, subject, sections, intro }: {
  title: string; subject: string; intro: string;
  sections: { heading: string; markdown: string }[];
}) {
  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow} fixed>
          <Text style={styles.brand}>Skillio</Text>
          <Text style={styles.brandTag}>{subject}</Text>
        </View>

        <Text style={styles.h1}>{clean(title)}</Text>
        {intro ? <Text style={styles.p}><Inline text={intro} /></Text> : null}

        {sections.map((sec, si) => (
          <View key={si}>
            <Text style={styles.h2} minPresenceAhead={60}>{clean(sec.heading)}</Text>
            {mdToBlocks(sec.markdown).map((b, bi) => <BlockView key={bi} b={b} />)}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Generado con Skillio</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const note_id = url.searchParams.get("note_id");
  if (!note_id) return new Response("note_id required", { status: 400 });

  const actor = await getActorReadonly();
  if (!actor) return new Response("no autorizado", { status: 401 });

  const sb = supabaseAdmin();
  const { data: note } = await sb.from("notes").select("id,title,subject_id").eq("id", note_id).eq("user_id", actor.id).single();
  if (!note) return new Response("no encontrado", { status: 404 });

  const subject = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Skillio"
    : "Skillio";

  const { data: output } = await sb
    .from("ai_outputs")
    .select("content")
    .eq("note_id", note_id)
    .eq("user_id", actor.id)
    .eq("kind", "summary")
    .maybeSingle();

  const md = readSummaryMarkdown(output?.content);
  if (!md) return new Response("resumen no disponible", { status: 404 });

  const parsed = parseSummaryMarkdown(md);
  const buffer = await renderToBuffer(
    <ResumenPdf
      title={parsed.title || note.title}
      subject={subject}
      intro={parsed.intro}
      sections={parsed.sections}
    />,
  );

  const safeName = (parsed.title || note.title || "resumen").replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
