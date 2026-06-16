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
