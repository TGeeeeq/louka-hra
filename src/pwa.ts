// Registrace PWA service workeru — JEN na webu.
//
// V Capacitor WebView (Android build) se service worker registrovat nesmí:
// nativní shell servíruje assety lokálně a SW by tam jen překážel (a na
// custom scheme `capacitor://` stejně pořádně nefunguje). Detekce přes
// isNative() (Capacitor.isNativePlatform) + kontrola podpory prohlížeče.
import { isNative } from "./platform";

export function setupPwa() {
  if (isNative()) return; // Android/iOS shell — bez service workeru
  if (import.meta.env.DEV) return; // v dev režimu SW neexistuje
  if (!("serviceWorker" in navigator)) return;

  // Dynamický import: virtuální modul vite-plugin-pwa existuje jen v buildu
  // a nesmí se natvrdo tahat do nativního bundle startu.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* registrace SW není kritická — hra běží i bez offline cache */
    });
}
