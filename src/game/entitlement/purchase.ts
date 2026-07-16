// Vrstva nákupů — připravená na Google Play / App Store (Capacitor billing),
// dnes běží webový náhled bez platební brány.
//
// Budoucí napojení (produkce v obchodech):
//   1. zabalit hru Capacitorem (https://capacitorjs.com)
//   2. přidat CapacitorBillingProvider (RevenueCat nebo
//      @capacitor-community/in-app-purchases); SKU je ve FULL_VERSION.storeIds
//   3. v getPurchaseProvider() vrátit billing provider, když běžíme nativně
//      (Capacitor.isNativePlatform()); restore() volat při startu aplikace
import { grantFull, hasFullVersion, revokeFull } from "./entitlements";

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
  // TODO (produkce): if (Capacitor.isNativePlatform()) return new CapacitorBillingProvider();
  return dev ? new DevProvider() : new WebPreviewProvider();
}
