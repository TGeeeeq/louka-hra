#!/usr/bin/env node
// Vygeneruje zdrojové obrázky pro ikonu aplikace, splash screen a adaptivní
// ikonu (Android). Vychází ze skutečného loga azylu (public/logo.webp),
// na loukově zelené (#2d5a3d) ploše.
//
// Výstup do assets/:
//   icon.png              1024×1024  ploché pozadí (jemný přechod) + logo ~60 % šířky
//   splash.png            2732×2732  stejné pozadí + logo ~30 % šířky (úvodní obrazovka)
//   icon-foreground.png   1024×1024  průhledné pozadí + logo ~55 % šířky (adaptivní ikona, popředí)
//   icon-background.png   1024×1024  plná barva #2d5a3d (adaptivní ikona, pozadí)
//
// Spuštění: node scripts/make-app-assets.mjs
// Navazuje na to `npm run assets:app`, který navíc spustí
// `npx @capacitor/assets generate --android` a rozpočítá výstupy do
// android/app/src/main/res/** pro všechny hustoty displeje.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.resolve(ROOT, "assets");
const LOGO = path.resolve(ROOT, "public/logo.webp");

const BG = "#2d5a3d"; // loukově zelená (theme-color z index.html)
const BG_LIGHT = "#4a8f5e"; // světlejší odstín pro jemný přechod

// Vytvoří PNG buffer s diagonálním přechodem BG → BG_LIGHT o daném rozměru.
function gradientBackground(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${BG}" />
          <stop offset="100%" stop-color="${BG_LIGHT}" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)" />
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Vrátí buffer loga zmenšeného tak, aby byl širší rozměr roven `targetWidth`.
async function resizedLogo(targetWidth) {
  const meta = await sharp(LOGO).metadata();
  const targetHeight = Math.round((meta.height / meta.width) * targetWidth);
  return sharp(LOGO)
    .resize(targetWidth, targetHeight, { fit: "inside" })
    .png()
    .toBuffer();
}

// Složí pozadí (buffer) a logo (o dané cílové šířce) na střed čtvercového plátna.
async function composeCentered({ size, backgroundBuffer, logoWidthRatio, outFile }) {
  const logo = await resizedLogo(Math.round(size * logoWidthRatio));
  const logoMeta = await sharp(logo).metadata();
  const left = Math.round((size - logoMeta.width) / 2);
  const top = Math.round((size - logoMeta.height) / 2);
  const out = await sharp(backgroundBuffer)
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer();
  await writeFile(path.join(OUT_DIR, outFile), out);
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 1) icon.png — 1024×1024, přechodové pozadí + logo ~60 % šířky
  const iconBg = await gradientBackground(1024);
  const icon = await composeCentered({
    size: 1024,
    backgroundBuffer: iconBg,
    logoWidthRatio: 0.6,
    outFile: "icon.png",
  });
  console.log(`✓ assets/icon.png  (${(icon.length / 1024).toFixed(0)} kB)`);

  // 2) splash.png — 2732×2732, stejné pozadí + logo ~30 % šířky
  const splashBg = await gradientBackground(2732);
  const splash = await composeCentered({
    size: 2732,
    backgroundBuffer: splashBg,
    logoWidthRatio: 0.3,
    outFile: "splash.png",
  });
  console.log(`✓ assets/splash.png  (${(splash.length / 1024).toFixed(0)} kB)`);

  // 3) icon-foreground.png — 1024×1024, průhledné pozadí + logo ~55 % šířky
  //    (popředí adaptivní ikony — Android ořízne bezpečnou zónu ~66 %, proto
  //    logo nesmí sahat až k okraji)
  const transparentBg = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
  const foreground = await composeCentered({
    size: 1024,
    backgroundBuffer: transparentBg,
    logoWidthRatio: 0.55,
    outFile: "icon-foreground.png",
  });
  console.log(`✓ assets/icon-foreground.png  (${(foreground.length / 1024).toFixed(0)} kB)`);

  // 4) icon-background.png — 1024×1024, plná barva (pozadí adaptivní ikony)
  const flatBg = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG },
  })
    .png()
    .toBuffer();
  await writeFile(path.join(OUT_DIR, "icon-background.png"), flatBg);
  console.log(`✓ assets/icon-background.png  (${(flatBg.length / 1024).toFixed(0)} kB)`);

  console.log("\nHotovo. Pro rozpočítání do android/app/src/main/res/** spusť:");
  console.log("  npx @capacitor/assets generate --android");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
