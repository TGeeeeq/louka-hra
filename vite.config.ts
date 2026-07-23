import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Relative base so the build also works when opened from a sub-path or static host.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    // PWA: offline podpora pro webovou verzi. Service worker se registruje
    // ručně v src/pwa.ts a JEN na webu — v Capacitor WebView (Android) se
    // nesmí spustit, aby nekolidoval s nativním cachováním assetů.
    VitePWA({
      injectRegister: null, // registraci řešíme sami (viz src/pwa.ts)
      registerType: "autoUpdate",
      manifest: {
        name: "Louka — azyl Nech mě růst",
        short_name: "Louka",
        description:
          "Survival hra azylu Nech mě růst z.s. Péče o zachráněná zvířata uprostřed lesů.",
        lang: "cs",
        display: "standalone",
        orientation: "landscape",
        background_color: "#1c2a1e",
        theme_color: "#2d5a3d",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache build assetů + fonty a klíčové obrázky z public/.
        globPatterns: ["**/*.{js,css,html,woff2,png,webp,svg}"],
        // Fotky zvířat jsou velké — cachují se líně za běhu, ne dopředu.
        globIgnores: ["animals/**"],
        runtimeCaching: [
          {
            urlPattern: /\/animals\/.*\.(?:webp|png|jpg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "louka-animals",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173, open: false },
});
