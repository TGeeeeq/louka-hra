import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { reducer, type Action } from "../game/engine/reducer";
import { initialState } from "../game/engine/state";
import { loadGame, saveGame } from "../game/engine/save";
import { hasFullVersion } from "../game/entitlement/entitlements";
import type { GameState } from "../game/types";

interface Store {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameCtx = createContext<Store | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => loadGame() ?? initialState(),
  );

  // Vlastnictví plné verze žije mimo save (louka-entitlements-v1) — po
  // načtení (i po RESETu) se do stavu vždy zrcadlí odtud. Save není zdrojem
  // pravdy o nákupu.
  useEffect(() => {
    dispatch({ type: "SET_FULL_VERSION", full: hasFullVersion() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started]);

  useEffect(() => {
    if (state.started) saveGame(state);
  }, [state]);

  return <GameCtx.Provider value={{ state, dispatch }}>{children}</GameCtx.Provider>;
}

export function useGame(): Store {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame musí být uvnitř <GameProvider>");
  return ctx;
}
