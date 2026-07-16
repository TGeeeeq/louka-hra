import type { CapacitorConfig } from "@capacitor/cli";

// Konfigurace pro Android shell (Capacitor). Web build (Vite, base: "./")
// se beze změny zabalí jako WebView aplikace — viz README, sekce Android.
const config: CapacitorConfig = {
  appId: "cz.nechmerust.louka",
  appName: "Louka",
  webDir: "dist",
};

export default config;
