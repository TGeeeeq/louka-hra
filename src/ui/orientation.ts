import { useEffect, useState } from "react";

/**
 * Louka se hraje NALEŽATO — a jenom naležato.
 *
 * Svět je široký výřez louky (~35×22 dlaždic) plus HUD nahoře a dotykové
 * ovládání dole; na výšku se to nedá poskládat tak, aby hráč viděl, kam jde.
 * Nativní shell to řeší v manifestu (`android:screenOrientation="sensorLandscape"`),
 * na webu/PWA se to hlídá tady: dokud je displej na výšku, přes hru leží
 * `RotateGate` a intro se ani nerozjede.
 */

const mq = (q: string) => typeof window !== "undefined" && window.matchMedia(q).matches;

/** Dotykové zařízení (telefon/tablet) — na myši se s orientací nic neřeší. */
export const isTouchDevice = () => mq("(pointer: coarse)");

/**
 * Je displej na výšku natolik, že hra nemá smysl?
 *
 * Na dotyku stačí, že je vyšší než širší (telefon v ruce). Na myši je „okno na
 * výšku" legitimní stav (někdo si zúžil prohlížeč), takže se blokuje až
 * opravdu úzké okno — jinak by desktopoví hráči koukali na výzvu, aby otočili
 * monitor.
 */
export function isPortraitBlocked(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerHeight <= window.innerWidth) return false;
  return isTouchDevice() || window.innerWidth < 620;
}

/**
 * Reaktivní verze `isPortraitBlocked()`. Poslouchá resize i orientationchange —
 * WebView si na Androidu občas jedno z nich nechá pro sebe, tak radši obojí.
 */
export function usePortraitBlocked(): boolean {
  const [blocked, setBlocked] = useState(isPortraitBlocked);
  useEffect(() => {
    let raf = 0;
    const sync = () => {
      // orientationchange přijde dřív, než se stihnou přepočítat rozměry —
      // proto se čte až v dalším rámci.
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => setBlocked(isPortraitBlocked()));
    };
    const m = window.matchMedia("(orientation: portrait)");
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    m.addEventListener?.("change", sync);
    sync();
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      m.removeEventListener?.("change", sync);
    };
  }, []);
  return blocked;
}

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** Umí prohlížeč zámek orientace? (Chrome/Android ano, iOS Safari ne.) */
export function canLockLandscape(): boolean {
  if (typeof window === "undefined" || !window.screen?.orientation) return false;
  return typeof (screen.orientation as LockableOrientation).lock === "function";
}

/**
 * Zkusí zamknout displej na šířku. Zámek jde jen ve fullscreenu, takže se
 * nejdřív žádá on — obojí best-effort: kde to nejde (iOS), hra jen čeká, až
 * hráč telefon otočí sám.
 */
export function tryLockLandscape(): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
  const lock = () => {
    (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape").catch(() => {});
  };
  if (document.fullscreenElement) {
    lock();
    return;
  }
  const fs = el.requestFullscreen?.();
  if (fs) fs.then(lock).catch(lock);
  else lock();
}
