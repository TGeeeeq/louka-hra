// Vlastnictví plné verze — ZÁMĚRNĚ mimo herní save (vlastní localStorage klíč).
// Reset hry ani smazání uložené pozice nikdy nesmí smazat nákup.
// Zdrojem pravdy je tenhle modul (později synchronizovaný s obchodem);
// GameState.fullVersion je jen zrcadlo pro čistý reducer.
//
// Jednorázová migrace ze starého DLC systému (senné DLC zrušeno, viz
// game/content/fullVersion.ts): kdo dřív vlastnil senné DLC (starý klíč
// `louka-dlc-v1` obsahující "senne"), dostává plnou verzi zdarma. Starý
// klíč se přitom nikdy nemaže — je to jen bezpečnostní záloha.
import { Preferences } from "@capacitor/preferences";
import { isNative } from "../../platform";

const KEY = "louka-entitlements-v1";
const OLD_DLC_KEY = "louka-dlc-v1";

interface Stored {
  full: boolean;
  /** Migrace ze starého DLC klíče už proběhla — nespouštět znovu. */
  migratedFromDlc?: boolean;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { full: false };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return { full: parsed.full === true, migratedFromDlc: parsed.migratedFromDlc === true };
  } catch {
    return { full: false };
  }
}

function write(s: Stored) {
  const raw = JSON.stringify(s);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* privátní režim — vlastnictví platí aspoň pro běžící session */
  }
  // D6: zrcadlo v Capacitor Preferences — nákup přežije i vyčištění dat
  // WebView (na rozdíl od localStorage). Fire-and-forget.
  if (isNative()) {
    void Preferences.set({ key: KEY, value: raw }).catch(() => {
      /* zrcadlení selhalo — localStorage už proběhlo */
    });
  }
}

/** Zkontroluje starý DLC klíč (jen jednou) a případně udělí plnou verzi. */
function ensureMigrated(): Stored {
  const cur = read();
  if (cur.migratedFromDlc) return cur;
  let full = cur.full;
  try {
    const raw = localStorage.getItem(OLD_DLC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.includes("senne")) full = true;
    }
  } catch {
    /* starý klíč nejde přečíst — migrace se prostě přeskočí */
  }
  const next: Stored = { full, migratedFromDlc: true };
  write(next);
  return next;
}

export function hasFullVersion(): boolean {
  return ensureMigrated().full;
}

export function grantFull(): boolean {
  write({ ...ensureMigrated(), full: true });
  return true;
}

export function revokeFull(): boolean {
  write({ ...ensureMigrated(), full: false });
  return false;
}
