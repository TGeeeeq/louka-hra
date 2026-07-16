// Nativní shell (Capacitor Android) — vše, co potřebuje `@capacitor/app` a
// `@capacitor/preferences`, je schované tady, ať zbytek hry zůstává čistý a
// funguje beze změny i na webu (viz platform.ts → isNative()).
//
// D2 (hardwarové tlačítko Zpět), D3 (pauza/probuzení aplikace) a část D6
// (obnova uložení ze zálohy při startu, když WebView úložiště zmizelo).
import { App as CapApp } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { isNative } from "./platform";

// Stejné klíče jako v save.ts / entitlements.ts — držet v souběhu ručně,
// modul si je nemůže importovat zpět bez cyklické závislosti a nestojí to
// za extra sdílený konstantní modul kvůli dvěma řetězcům.
const SAVE_KEY = "louka-save-v2";
const ENTITLEMENTS_KEY = "louka-entitlements-v1";

/** Zaregistruje posluchač hardwarového tlačítka Zpět (jen na nativní
 * platformě — na webu je no-op a vrátí prázdný úklid). Vrací cleanup funkci. */
export function registerBackButton(onBack: () => void): () => void {
  if (!isNative()) return () => {};
  let handle: { remove: () => void } | null = null;
  let cancelled = false;
  void CapApp.addListener("backButton", () => onBack()).then((h) => {
    if (cancelled) void h.remove();
    else handle = h;
  });
  return () => {
    cancelled = true;
    handle?.remove();
  };
}

/** Ukončí aplikaci (Android). Na webu no-op. */
export async function exitApp(): Promise<void> {
  if (!isNative()) return;
  try {
    await CapApp.exitApp();
  } catch {
    /* na některých zařízeních může selhat — nic víc se dělat nedá */
  }
}

interface LifecycleCallbacks {
  /** Aplikace jde na pozadí (Android onPause / web tab hidden). */
  onBackground: () => void;
  /** Aplikace se vrací do popředí (Android onResume / web tab visible). */
  onForeground: () => void;
}

/** D3: sleduje životní cyklus aplikace — na nativní platformě přes
 * `appStateChange` (isActive), na webu přes `visibilitychange`. Zaregistruj
 * jednou (App.tsx) a ulož vrácenou cleanup funkci. */
export function registerLifecycle(cb: LifecycleCallbacks): () => void {
  if (isNative()) {
    let handle: { remove: () => void } | null = null;
    let cancelled = false;
    void CapApp.addListener("appStateChange", (state) => {
      if (state.isActive) cb.onForeground();
      else cb.onBackground();
    }).then((h) => {
      if (cancelled) void h.remove();
      else handle = h;
    });
    return () => {
      cancelled = true;
      handle?.remove();
    };
  }
  // Web fallback: žádný Capacitor plugin, jen standardní stránková událost.
  const onVisibility = () => {
    if (document.hidden) cb.onBackground();
    else cb.onForeground();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

/** Obnoví jeden klíč z Preferences do localStorage, ale JEN pokud tam ještě
 * nic není — nikdy nepřepisuje čerstvá webová data starší nativní zálohou. */
async function restoreKeyIfMissing(key: string): Promise<void> {
  try {
    if (localStorage.getItem(key) != null) return;
  } catch {
    return; // localStorage nedostupný — obnovovat není kam
  }
  try {
    const { value } = await Preferences.get({ key });
    if (value != null) localStorage.setItem(key, value);
  } catch {
    /* Preferences nedostupné nebo prázdné — hra prostě začne od začátku */
  }
}

/**
 * D6 — spustit PŘED prvním renderem (main.tsx), než store.tsx poprvé zavolá
 * loadGame()/hasFullVersion(). Když bylo WebView úložiště vyčištěno (např.
 * uživatel smazal data appky v nastavení Androidu), ale nativní Preferences
 * pořád mají zálohu uloženého postupu i vlastnictví plné verze, obnoví ji
 * zpátky do localStorage — hráč tak o postup ani o zakoupenou plnou verzi
 * nepřijde. Na webu je to okamžitě vyřešený no-op.
 */
export async function bootstrapNative(): Promise<void> {
  if (!isNative()) return;
  await Promise.all([restoreKeyIfMissing(SAVE_KEY), restoreKeyIfMissing(ENTITLEMENTS_KEY)]);
}
