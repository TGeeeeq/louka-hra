import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GameProvider } from "./ui/store";
import { RotateGate } from "./ui/components/RotateGate";
import { bootstrapNative } from "./native";
import { setupPwa } from "./pwa";
import "./styles/global.css";

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <GameProvider>
        <App />
        {/* Hra je naležato-only: na výšku leží přes všechno zámek orientace —
            i nad rozehranou hrou, kdyby hráč telefon otočil během hraní. */}
        <RotateGate />
      </GameProvider>
    </StrictMode>,
  );
}

// D6: na nativním shellu nejdřív (asynchronně) obnovit save/entitlements
// z Capacitor Preferences do localStorage, pokud tam po vyčištění dat
// appky nic nezůstalo — teprve pak store.tsx poprvé zavolá loadGame().
// Na webu bootstrapNative() vrátí okamžitě vyřešený příslib.
void bootstrapNative().finally(render);

// PWA offline cache — registruje se jen na webu (uvnitř je detekce platformy).
setupPwa();
