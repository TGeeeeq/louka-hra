// Detekce běhového prostředí (web vs. nativní shell).
//
// Dnes je tohle vždy web (Vercel) — funkce je záměrně stub. Až přibude
// Android shell (Capacitor), nahradí se tělo funkce voláním
// `Capacitor.isNativePlatform()` a zbytek hry (demo brána, HUD odznak…)
// se automaticky „probudí" beze změny.
export function isNative(): boolean {
  // Jen pro testování demo brány na webu přes dev konzoli:
  // localStorage.setItem("louka-force-native", "1")
  try {
    if (localStorage.getItem("louka-force-native") === "1") return true;
  } catch {
    /* localStorage nedostupný (privátní režim) — ber jako web */
  }
  return false;
}

/** Je aktivní demo brána (free verze = tutoriál + první dny)? Jen na nativní platformě. */
export function demoGateActive(): boolean {
  return isNative();
}
