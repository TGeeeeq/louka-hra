#!/usr/bin/env node
// Stáhne fotky skutečných obyvatel z nechmerust.org a zmenší je pro hru.
// Výstup: public/animals/<id>.webp (max 640 px delší strana, webp q72).
// Spuštění: npm run photos   (přegenerování: npm run photos -- --force)
//
// Fotky patří azylu Nech mě růst z.s. — hra vzniká pro azyl, použití se souhlasem.
import { mkdir, access, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve(process.cwd(), "public/animals");
const BASE = "https://www.nechmerust.org/assets";
const FORCE = process.argv.includes("--force");

// id zvířete ve hře → název souboru na webu (bez přípony).
// List chybí záměrně — pohřešuje se, fotku nemá.
const PHOTOS = {
  pipinky: "pipinky1",
  husy: "husy1",
  kachny: "kachny1",
  holoubci: "holoubci1",
  princezna: "princezna1",
  flicek: "flicek1",
  karel: "karel1",
  yakul: "yakul1",
  avala: "avala1",
  kveta: "kveta1",
  pogo: "pogo1",
  lucinka: "lucinka1",
  anaya: "anaya1",
  eduard: "eduard1",
  emil: "emil1",
  amalka: "amalka1",
  kulich: "kulich1",
  konci: "konci1",
  riky: "riky1",
  kesy: "kesy1",
  atila: "atila1",
  denis: "denis1",
  roman: "roman1",
  safir: "safir1",
  patricie: "patricie1",
  hanicka: "hanicka1",
  lotka: "lotka1",
  masa: "masa1",
  kralici: "kralici1",
};

const exists = (p) => access(p).then(() => true, () => false);

async function fetchOne(id, src) {
  const out = path.join(OUT_DIR, `${id}.webp`);
  if (!FORCE && (await exists(out))) {
    console.log(`· ${id} — už existuje, přeskakuji`);
    return { id, skipped: true };
  }
  const url = `${BASE}/${src}.webp`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const small = await sharp(raw)
    .rotate() // respektuj EXIF orientaci
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  await writeFile(out, small);
  console.log(`✓ ${id}  ${(raw.length / 1024).toFixed(0)} kB → ${(small.length / 1024).toFixed(0)} kB`);
  return { id, bytes: small.length };
}

await mkdir(OUT_DIR, { recursive: true });
let total = 0;
const failed = [];
for (const [id, src] of Object.entries(PHOTOS)) {
  try {
    const r = await fetchOne(id, src);
    total += r.bytes ?? 0;
  } catch (e) {
    failed.push(id);
    console.error(`✗ ${id}: ${e.message}`);
  }
}
console.log(`\nHotovo. Nově staženo ${(total / 1024 / 1024).toFixed(2)} MB.`);
if (failed.length) {
  console.error(`Selhalo: ${failed.join(", ")}`);
  process.exit(1);
}
