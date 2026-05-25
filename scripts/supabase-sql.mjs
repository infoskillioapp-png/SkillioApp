#!/usr/bin/env node
/**
 * Ejecuta SQL contra la base de datos de Supabase via Management API.
 *
 * Uso:
 *   node scripts/supabase-sql.mjs supabase/schema.sql
 *   echo "select 1;" | node scripts/supabase-sql.mjs -
 */
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("uso: node scripts/supabase-sql.mjs <archivo.sql | ->");
  process.exit(2);
}

// Cargar .env.local manualmente (sin dependencias)
const env = await readFile(".env.local", "utf8").catch(() => "");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("faltan SUPABASE_ACCESS_TOKEN y/o SUPABASE_PROJECT_REF en .env.local");
  process.exit(2);
}

let sql;
if (file === "-") {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  sql = Buffer.concat(chunks).toString("utf8");
} else {
  sql = await readFile(file, "utf8");
}

const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`HTTP ${res.status} OK`);
console.log(JSON.stringify(body, null, 2));
