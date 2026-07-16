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
    if (state.started) saveGame(state);
  }, [state]);

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

export function useGame(): Store {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame musí být uvnitř <GameProvider>");
  return ctx;
}
