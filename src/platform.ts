// Detekce běhového prostředí (web vs. nativní shell).
//
// Android shell (Capacitor) už existuje — `Capacitor.isNativePlatform()`
// vrátí true uvnitř zabalené APK (viz android/, capacitor.config.ts),
// na webu (Vercel) vrací bezpečně false, takže zbytek hry (demo brána,
// HUD odznak…) funguje beze změny na obou platformách.
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  if (Capacitor.isNativePlatform()) return true;
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
