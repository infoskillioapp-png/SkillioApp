import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: Request) {
  try {
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return NextResponse.json({ error: "empty" }, { status: 400 });
    const doc = await PDFDocument.load(new Uint8Array(buf), { ignoreEncryption: true });
    return NextResponse.json({ pages: doc.getPageCount() });
  } catch {
    return NextResponse.json({ error: "invalid_pdf" }, { status: 400 });
  }
}
