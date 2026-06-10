"use client";

// ============================================================
// Export de resúmenes a PDF branded (Skillio).
// Se importa de forma dinámica desde el modal para que
// @react-pdf/renderer quede en un chunk aparte (no infla el bundle).
// PDF vectorial real: texto seleccionable, sin servicios externos.
// ============================================================

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
  pdf,
} from "@react-pdf/renderer";
import type {
  SummaryResult,
  PuntosClaveData,
  MapaData,
  FichaData,
} from "./result-modal";

// ── Paleta de marca (igual que la app) ──
const C = {
  accent: "#A5402D",
  accent2: "#C85C42",
  ink: "#353831",
  inkSoft: "#6B6B65",
  inkSofter: "#9A9A92",
  paper: "#FFFFFF",
  paperWarm: "#FDF7F5",
  rule: "#EADFDB",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: C.ink,
    fontSize: 10.5,
    lineHeight: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 17,
    color: C.ink,
    marginLeft: 7,
    letterSpacing: -0.4,
  },
  kindTag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rule: { height: 2, backgroundColor: C.accent, marginTop: 8, marginBottom: 18, width: 44, borderRadius: 2 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 14,
    lineHeight: 1.15,
  },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 16, color: C.accent, marginTop: 16, marginBottom: 4 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13, color: C.ink, marginTop: 13, marginBottom: 3 },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 11.5, color: C.ink, marginTop: 9, marginBottom: 2 },
  p: { fontSize: 10.5, color: C.ink, marginTop: 5, lineHeight: 1.55 },
  liRow: { flexDirection: "row", marginTop: 4, paddingRight: 6 },
  liBullet: { width: 14, color: C.accent, fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  liText: { flex: 1, fontSize: 10.5, color: C.ink, lineHeight: 1.5 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
    paddingLeft: 10,
    marginTop: 8,
    color: C.inkSoft,
    fontFamily: "Helvetica-Oblique",
    fontSize: 10.5,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingVertical: 4 },
  tableCell: { flex: 1, fontSize: 9.5, color: C.ink, paddingRight: 6 },
  tableCellHead: { flex: 1, fontSize: 9.5, color: C.ink, fontFamily: "Helvetica-Bold", paddingRight: 6 },
  // Puntos clave
  pkCard: {
    marginTop: 8,
    padding: 11,
    backgroundColor: C.paperWarm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  pkCat: { fontSize: 7.5, color: C.accent, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  pkTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 2 },
  pkDesc: { fontSize: 10, color: C.inkSoft, lineHeight: 1.5 },
  // Ficha
  fSection: { marginTop: 12, borderWidth: 0.5, borderColor: C.rule, borderRadius: 8, overflow: "hidden" },
  fHead: { backgroundColor: C.paperWarm, paddingVertical: 6, paddingHorizontal: 11, fontFamily: "Helvetica-Bold", fontSize: 11.5, color: C.ink },
  fItem: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 11, borderTopWidth: 0.5, borderTopColor: C.rule },
  fLabel: { width: 120, fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.accent, paddingRight: 8 },
  fDetail: { flex: 1, fontSize: 9.5, color: C.ink, lineHeight: 1.5 },
  intro: { fontSize: 10, color: C.inkSoft, fontFamily: "Helvetica-Oblique", marginBottom: 8 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: C.inkSofter },
  footerBrand: { fontSize: 8, color: C.accent, fontFamily: "Helvetica-Bold" },
});

// ── Logo mark (hexágono) reconstruido con primitivas de react-pdf ──
function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Path d="M26 2 L47 14 L47 38 L26 50 L5 38 L5 14Z" fill={C.accent} />
      <Rect x={13} y={28} width={7} height={10} rx={2} fill="rgba(255,255,255,0.6)" />
      <Rect x={22} y={21} width={7} height={17} rx={2} fill="rgba(255,255,255,0.8)" />
      <Rect x={31} y={14} width={7} height={24} rx={2} fill="#FFFFFF" />
      <Rect x={12} y={39} width={27} height={2} rx={1} fill="rgba(255,255,255,0.4)" />
      <Circle cx={34.5} cy={12} r={2} fill="rgba(255,255,255,0.8)" />
    </Svg>
  );
}

// ── Helpers de markdown → bloques ──
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu;
const clean = (s: string) => (s ?? "").replace(EMOJI_RE, "").replace(/\s+$/g, "");

type Run = { t: string; b: boolean; i: boolean };

function parseInline(raw: string): Run[] {
  const text = clean(raw)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → texto
    .replace(/`([^`]+)`/g, "$1"); // inline code → texto
  const runs: Run[] = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ t: text.slice(last, m.index), b: false, i: false });
    if (m[1] || m[2]) runs.push({ t: m[1] || m[2], b: true, i: false });
    else runs.push({ t: m[3] || m[4], b: false, i: true });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ t: text.slice(last), b: false, i: false });
  return runs.length ? runs : [{ t: text, b: false, i: false }];
}

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string; n?: number }
  | { type: "quote"; text: string }
  | { type: "trow"; cells: string[]; head?: boolean };

function parseMarkdown(md: string): Block[] {
  const lines = (md ?? "").replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let oli = 0;
  const flush = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };
  let prevWasTable = false;
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) {
      flush();
      oli = 0;
      prevWasTable = false;
      continue;
    }
    let mm: RegExpMatchArray | null;
    if ((mm = t.match(/^(#{1,4})\s+(.*)/))) {
      flush();
      oli = 0;
      blocks.push({ type: "h", level: mm[1].length, text: mm[2] });
    } else if (/^\|(.+)\|$/.test(t)) {
      flush();
      if (/^\|[\s:|-]+\|$/.test(t)) {
        prevWasTable = true;
        continue;
      }
      const cells = t.replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
      blocks.push({ type: "trow", cells, head: !prevWasTable && !blocks.some((b) => b.type === "trow") });
      prevWasTable = true;
    } else if ((mm = t.match(/^[-*+]\s+(.*)/))) {
      flush();
      oli = 0;
      blocks.push({ type: "li", text: mm[1] });
    } else if ((mm = t.match(/^\d+\.\s+(.*)/))) {
      flush();
      oli += 1;
      blocks.push({ type: "li", text: mm[1], n: oli });
    } else if ((mm = t.match(/^>\s?(.*)/))) {
      flush();
      oli = 0;
      blocks.push({ type: "quote", text: mm[1] });
    } else {
      para.push(t);
    }
  }
  flush();
  return blocks;
}

type PdfStyle = (typeof styles)[keyof typeof styles];

function InlineText({ runs, style }: { runs: Run[]; style?: PdfStyle }) {
  return (
    <Text style={style}>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontFamily: r.b ? "Helvetica-Bold" : r.i ? "Helvetica-Oblique" : "Helvetica",
          }}
        >
          {r.t}
        </Text>
      ))}
    </Text>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "h") {
          const st = b.level <= 1 ? styles.h1 : b.level === 2 ? styles.h2 : styles.h3;
          return <InlineText key={i} runs={parseInline(b.text)} style={st} />;
        }
        if (b.type === "p") return <InlineText key={i} runs={parseInline(b.text)} style={styles.p} />;
        if (b.type === "li") {
          return (
            <View key={i} style={styles.liRow} wrap={false}>
              <Text style={styles.liBullet}>{b.n ? `${b.n}.` : "•"}</Text>
              <InlineText runs={parseInline(b.text)} style={styles.liText} />
            </View>
          );
        }
        if (b.type === "quote") return <InlineText key={i} runs={parseInline(b.text)} style={styles.quote} />;
        if (b.type === "trow") {
          return (
            <View key={i} style={styles.tableRow} wrap={false}>
              {b.cells.map((c, j) => (
                <Text key={j} style={b.head ? styles.tableCellHead : styles.tableCell}>
                  {clean(c)}
                </Text>
              ))}
            </View>
          );
        }
        return null;
      })}
    </>
  );
}

function PageChrome({ kindLabel, children }: { kindLabel: string; children: React.ReactNode }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerRow} fixed>
        <View style={styles.brandRow}>
          <LogoMark size={22} />
          <Text style={styles.wordmark}>skillio.</Text>
        </View>
        <Text style={styles.kindTag}>{kindLabel}</Text>
      </View>
      <View style={styles.rule} fixed />
      {children}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          Generado con <Text style={styles.footerBrand}>Skillio</Text> · skillio.app — Aprobá tus parciales con IA
        </Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

function SummaryDoc({ result }: { result: SummaryResult }) {
  const label =
    result.format === "puntos_clave"
      ? "Puntos clave"
      : result.format === "ficha"
        ? "Ficha de estudio"
        : result.format === "mapa"
          ? "Mapa conceptual"
          : "Resumen";

  // Resumen / legacy markdown
  if ("text" in result && typeof result.text === "string") {
    return (
      <Document title="Resumen Skillio" author="Skillio">
        <PageChrome kindLabel={label}>
          <Text style={styles.title}>Resumen</Text>
          <Blocks blocks={parseMarkdown(result.text)} />
        </PageChrome>
      </Document>
    );
  }

  if (result.format === "puntos_clave" && "data" in result) {
    const d = result.data as PuntosClaveData;
    return (
      <Document title={clean(d.title) || "Puntos clave"} author="Skillio">
        <PageChrome kindLabel={label}>
          <Text style={styles.title}>{clean(d.title) || "Puntos clave"}</Text>
          {d.intro ? <Text style={styles.intro}>{clean(d.intro)}</Text> : null}
          {d.points.map((p, i) => (
            <View key={i} style={styles.pkCard} wrap={false}>
              {p.category ? <Text style={styles.pkCat}>{clean(p.category)}</Text> : null}
              <Text style={styles.pkTitle}>{clean(p.title)}</Text>
              <Text style={styles.pkDesc}>{clean(p.description)}</Text>
            </View>
          ))}
        </PageChrome>
      </Document>
    );
  }

  if (result.format === "ficha" && "data" in result) {
    const d = result.data as FichaData;
    return (
      <Document title={clean(d.title) || "Ficha"} author="Skillio">
        <PageChrome kindLabel={label}>
          <Text style={styles.title}>{clean(d.title) || "Ficha de estudio"}</Text>
          {d.topic ? <Text style={styles.intro}>Tema: {clean(d.topic)}</Text> : null}
          {d.sections.map((sec, i) => (
            <View key={i} style={styles.fSection} wrap={false}>
              <Text style={styles.fHead}>{clean(sec.heading)}</Text>
              {sec.items.map((it, j) => (
                <View key={j} style={styles.fItem}>
                  <Text style={styles.fLabel}>{clean(it.label)}</Text>
                  <Text style={styles.fDetail}>{clean(it.detail)}</Text>
                </View>
              ))}
            </View>
          ))}
        </PageChrome>
      </Document>
    );
  }

  if (result.format === "mapa" && "data" in result) {
    const d = result.data as MapaData;
    return (
      <Document title={clean(d.title) || "Mapa conceptual"} author="Skillio">
        <PageChrome kindLabel={label}>
          <Text style={styles.title}>{clean(d.title) || "Mapa conceptual"}</Text>
          <Blocks blocks={parseMarkdown(d.outline)} />
        </PageChrome>
      </Document>
    );
  }

  // Fallback
  return (
    <Document title="Resumen Skillio" author="Skillio">
      <PageChrome kindLabel={label}>
        <Text style={styles.title}>Resumen</Text>
        <Text style={styles.p}>No se pudo generar el contenido.</Text>
      </PageChrome>
    </Document>
  );
}

function sanitize(name: string) {
  return (name || "resumen-skillio")
    .replace(EMOJI_RE, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "resumen-skillio";
}

export async function downloadSummaryPdf(result: SummaryResult, fileBase?: string) {
  const blob = await pdf(<SummaryDoc result={result} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitize(fileBase || "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
