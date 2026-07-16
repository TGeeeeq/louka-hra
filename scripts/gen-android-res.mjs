#!/usr/bin/env node
// Přímé vygenerování Android ikon/splash z assets/*.png bez závislosti na
// `@capacitor/assets` (ten si při prvním spuštění stahuje starou verzi
// balíčku `sharp`, jejíž binárka se v tomto sandboxu nedala stáhnout z
// GitHub Releases — 403 od proxy, viz poznámka v docs/android-release.md).
// Na běžném stroji s normálním přístupem k internetu stačí:
//   npm run assets:app
// (spustí make-app-assets.mjs a pak `npx @capacitor/assets generate --android`,
// který dělá totéž a navíc drží krok s budoucími verzemi nástroje).
//
// Tento skript čte assets/icon.png, assets/icon-foreground.png a
// assets/splash.png a rozpočítá je do android/app/src/main/res/** ve
// všech hustotách, které projekt (výchozí Capacitor šablona) očekává.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ASSETS = path.resolve(ROOT, "assets");
const RES = path.resolve(ROOT, "android/app/src/main/res");

const BG = "#2d5a3d";
const BG_LIGHT = "#4a8f5e";

const DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

// Legacy launcher icon (pre-Android 8 / API < 26, bez adaptivní ikony) — 48dp báze.
const LEGACY_ICON_DP = 48;
// Popředí adaptivní ikony — 108dp báze (66dp bezpečná zóna uprostřed).
const ADAPTIVE_FG_DP = 108;

function gradientSvg(w, h) {
  return `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${BG}" />
          <stop offset="100%" stop-color="${BG_LIGHT}" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)" />
    </svg>
  `;
}

async function writePng(buf, ...segments) {
  const out = path.join(RES, ...segments);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, buf);
  console.log(`✓ ${path.relative(ROOT, out)}  (${(buf.length / 1024).toFixed(1)} kB)`);
}

async function genLauncherIcons() {
  const iconSrc = await readFile(path.join(ASSETS, "icon.png"));
  for (const [bucket, scale] of Object.entries(DENSITIES)) {
    const size = Math.round(LEGACY_ICON_DP * scale);
    const resized = await sharp(iconSrc).resize(size, size).png().toBuffer();
    await writePng(resized, `mipmap-${bucket}`, "ic_launcher.png");
    await writePng(resized, `mipmap-${bucket}`, "ic_launcher_round.png");
  }
}

async function genAdaptiveForeground() {
  const fgSrc = await readFile(path.join(ASSETS, "icon-foreground.png"));
  for (const [bucket, scale] of Object.entries(DENSITIES)) {
    const size = Math.round(ADAPTIVE_FG_DP * scale);
    const resized = await sharp(fgSrc).resize(size, size).png().toBuffer();
    await writePng(resized, `mipmap-${bucket}`, "ic_launcher_foreground.png");
  }
}

async function updateAdaptiveBackgroundColor() {
  const file = path.join(RES, "values/ic_launcher_background.xml");
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`;
  await writeFile(file, xml, "utf-8");
  console.log(`✓ ${path.relative(ROOT, file)}  (barva pozadí adaptivní ikony = ${BG})`);
}

// Splash se generuje přímo na cílový rozměr (ne přeškálováním čtvercového
// assets/splash.png), aby nedocházelo ke zkreslení nebo deformaci loga.
const SPLASH_SIZES = {
  "drawable/splash.png": [480, 320],
  "drawable-land-mdpi/splash.png": [480, 320],
  "drawable-land-hdpi/splash.png": [800, 480],
  "drawable-land-xhdpi/splash.png": [1280, 720],
  "drawable-land-xxhdpi/splash.png": [1600, 960],
  "drawable-land-xxxhdpi/splash.png": [1920, 1280],
  "drawable-port-mdpi/splash.png": [320, 480],
  "drawable-port-hdpi/splash.png": [480, 800],
  "drawable-port-xhdpi/splash.png": [720, 1280],
  "drawable-port-xxhdpi/splash.png": [960, 1600],
  "drawable-port-xxxhdpi/splash.png": [1280, 1920],
};

async function resizedLogo(targetWidth) {
  const LOGO = path.resolve(ROOT, "public/logo.webp");
  const meta = await sharp(LOGO).metadata();
  const targetHeight = Math.round((meta.height / meta.width) * targetWidth);
  return sharp(LOGO).resize(targetWidth, targetHeight, { fit: "inside" }).png().toBuffer();
}

async function genSplash() {
  for (const [rel, [w, h]] of Object.entries(SPLASH_SIZES)) {
    const bg = await sharp(Buffer.from(gradientSvg(w, h))).png().toBuffer();
    const logo = await resizedLogo(Math.round(Math.min(w, h) * 0.3));
    const logoMeta = await sharp(logo).metadata();
    const left = Math.round((w - logoMeta.width) / 2);
    const top = Math.round((h - logoMeta.height) / 2);
    const out = await sharp(bg).composite([{ input: logo, left, top }]).png().toBuffer();
    const [dir, file] = rel.split("/");
    await writePng(out, dir, file);
  }
}

async function main() {
  await genLauncherIcons();
  await genAdaptiveForeground();
  await updateAdaptiveBackgroundColor();
  await genSplash();
  console.log("\nHotovo — android/app/src/main/res/** aktualizováno.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
