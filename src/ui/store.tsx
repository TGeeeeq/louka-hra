import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { reducer, type Action } from "../game/engine/reducer";
import { initialState } from "../game/engine/state";
import { loadGame, saveGame } from "../game/engine/save";
import { hasFullVersion } from "../game/entitlement/entitlements";
import { demoGateActive } from "../platform";
import { DEMO_DAYS } from "../game/balance";
import type { GameState } from "../game/types";

interface Store {
  state: GameState;
  dispatch: Dispatch<Action>;
  /**
   * Kolikrát demo brána zablokovala spánek (SLEEP) v této session. Čistě
   * přechodné UI-signály — NENÍ součástí GameState, takže se nikdy neukládá
   * do save a nemůže ho poškodit. App.tsx sleduje změny a otevře Plnou verzi.
   */
  demoGateHit: number;
}

const GameCtx = createContext<Store | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(
    reducer,
    undefined,
    () => loadGame() ?? initialState(),
  );
  const [demoGateHit, setDemoGateHit] = useState(0);

  // Vlastnictví plné verze žije mimo save (louka-entitlements-v1) — po
  // načtení (i po RESETu) se do stavu vždy zrcadlí odtud. Save není zdrojem
  // pravdy o nákupu.
  useEffect(() => {
    rawDispatch({ type: "SET_FULL_VERSION", full: hasFullVersion() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started]);

  useEffect(() => {
    if (state.started) scheduleSave(state);
  }, [state]);

  // Úklid při odpojení providéru (HMR, testy): rozdělaný debounce nesmí
  // vystřelit po unmountu, ale poslední stav se přesto zapíše hned teď —
  // ať se neztratí posledních pár sekund postupu.
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, []);

  // Demo brána (C3): na nativním shellu (viz platform.ts) bez plné verze
  // hráč nesmí usnout za koncem demo úseku (den DEMO_DAYS → DEMO_DAYS+1).
  // Zachytí se tu, na jediném místě, ať to funguje bez ohledu na to, odkud
  // se SLEEP zavolá (Hud tlačítko „Jít spát" i chalupa ve WorldCanvas).
  // Volné pobíhání, krmení atd. zůstávají na 3. dni možné navždy — blokuje
  // se jen samotný přechod dne.
  const dispatch: Dispatch<Action> = useMemo(
    () => (action) => {
      if (
        action.type === "SLEEP" &&
        !state.fullVersion &&
        demoGateActive() &&
        state.day >= DEMO_DAYS
      ) {
        setDemoGateHit((n) => n + 1);
        return;
      }
      rawDispatch(action);
    },
    [state.fullVersion, state.day],
  );

  return (
    <GameCtx.Provider value={{ state, dispatch, demoGateHit }}>{children}</GameCtx.Provider>
  );
}

// ─── D6: debounce autosave + okamžitý flush ────────────────────────────────
// Save do localStorage/Preferences se dřív volal na KAŽDOU změnu stavu — při
// rychlém sledu akcí (dialogy, odměny, sezónní přechody) to zbytečně mlelo
// disk/WebView storage. Teď se ukládá nanejvýš jednou za SAVE_DEBOUNCE_MS
// (trailing edge — vždycky s POSLEDNÍM známým stavem), a k dispozici je
// i okamžitý flushSave() pro místa, kde na 2s čekat nejde (ukončení appky
// tlačítkem Zpět, přechod na pozadí — viz native.ts / App.tsx).
const SAVE_DEBOUNCE_MS = 2000;
let pendingState: GameState | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(s: GameState) {
  pendingState = s;
  if (debounceTimer != null) return; // časovač už běží, tenhle stav se stihne vzít při odpálení
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (pendingState) saveGame(pendingState);
  }, SAVE_DEBOUNCE_MS);
}

/** Okamžitě zapíše poslední známý stav bez čekání na debounce. */
export function flushSave() {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pendingState) saveGame(pendingState);
}

export function useGame(): Store {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame musí být uvnitř <GameProvider>");
  return ctx;
}
