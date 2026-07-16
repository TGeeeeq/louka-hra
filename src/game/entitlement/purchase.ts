// Vrstva nákupů — na webu běží jen náhled bez platební brány, na Androidu
// (D7) skutečné Google Play Billing přes CapacitorBillingProvider (viz
// ./billing.ts — cordova-plugin-purchase v13, produkt cz.nechmerust.louka.full
// z FULL_VERSION.storeIds.googlePlay).
import { grantFull, hasFullVersion, revokeFull } from "./entitlements";
import { isNative } from "../../platform";
import { CapacitorBillingProvider } from "./billing";

export interface PurchaseResult {
  ok: boolean;
  owned: boolean;
  message?: string;
}

export interface PurchaseProvider {
  readonly name: string;
  /** Vrátí, jestli hráč plnou verzi vlastní (restore při startu). */
  init(): Promise<boolean>;
  purchase(): Promise<PurchaseResult>;
  restore(): Promise<boolean>;
}

/** Webový náhled: neprodává nic, jen vlídně vysvětlí a odkáže na podporu azylu. */
export class WebPreviewProvider implements PurchaseProvider {
  readonly name = "web-preview";
  async init() {
    return hasFullVersion();
  }
  async purchase(): Promise<PurchaseResult> {
    return {
      ok: false,
      owned: hasFullVersion(),
      message:
        "Nákup plné verze dorazí s mobilní aplikací (Google Play / App Store). " +
        "Zatím můžeš Louku podpořit přímo na nechmerust.org 💚",
    };
  }
  async restore() {
    return hasFullVersion();
  }
}

/** Developerský provider: okamžité udělení/odebrání pro testování. */
export class DevProvider implements PurchaseProvider {
  readonly name = "dev";
  async init() {
    return hasFullVersion();
  }
  async purchase(): Promise<PurchaseResult> {
    return { ok: true, owned: grantFull(), message: "🛠️ [dev] Plná verze odemčena." };
  }
  async restore() {
    return hasFullVersion();
  }
  async revoke(): Promise<boolean> {
    return revokeFull();
  }
}

export function getPurchaseProvider(dev: boolean): PurchaseProvider {
  // Dev přepínač má vždy přednost (rychlé testování i na nativním buildu).
  if (dev) return new DevProvider();
  // Nativní shell (Capacitor Android) → skutečné Google Play Billing.
  // CapacitorBillingProvider si sám ověří, že CdvPurchase globál existuje —
  // pokud ne (např. plugin ještě nenaběhl), chová se jako WebPreviewProvider.
  if (isNative()) {
    return new CapacitorBillingProvider();
  }
  return new WebPreviewProvider();
}
