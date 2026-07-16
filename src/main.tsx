import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GameProvider } from "./ui/store";
import { bootstrapNative } from "./native";
import "./styles/global.css";

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <GameProvider>
        <App />
      </GameProvider>
    </StrictMode>,
  );
}

// D6: na nativním shellu nejdřív (asynchronně) obnovit save/entitlements
// z Capacitor Preferences do localStorage, pokud tam po vyčištění dat
// appky nic nezůstalo — teprve pak store.tsx poprvé zavolá loadGame().
// Na webu bootstrapNative() vrátí okamžitě vyřešený příslib.
void bootstrapNative().finally(render);
