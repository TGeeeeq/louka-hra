// Vrstva nákupů — připravená na Google Play / App Store (Capacitor billing),
// dnes běží webový náhled bez platební brány.
//
// Budoucí napojení (produkce v obchodech):
//   1. zabalit hru Capacitorem (https://capacitorjs.com)
//   2. přidat CapacitorBillingProvider (RevenueCat nebo
//      @capacitor-community/in-app-purchases); SKU jsou v DLC_CATALOG.storeIds
//   3. v getPurchaseProvider() vrátit billing provider, když běžíme nativně
//      (Capacitor.isNativePlatform()); restore() volat při startu aplikace
import type { DlcId } from "../types";
import { getOwnedDlc, grantDlc, revokeDlc } from "./entitlements";

export interface PurchaseResult {
  ok: boolean;
  owned: DlcId[];
  message?: string;
}

export interface PurchaseProvider {
  readonly name: string;
  /** Vrátí známá vlastnictví (restore při startu). */
  init(): Promise<DlcId[]>;
  purchase(id: DlcId): Promise<PurchaseResult>;
  restore(): Promise<DlcId[]>;
}

/** Webový náhled: nic neprodává, jen vlídně vysvětlí a odkáže na podporu azylu. */
export class WebPreviewProvider implements PurchaseProvider {
  readonly name = "web-preview";
  async init() {
    return getOwnedDlc();
  }
  async purchase(): Promise<PurchaseResult> {
    return {
      ok: false,
      owned: getOwnedDlc(),
      message:
        "Nákupy dorazí s mobilní verzí (Google Play / App Store). " +
        "Zatím můžeš Louku podpořit přímo na nechmerust.org 💚",
    };
  }
  async restore() {
    return getOwnedDlc();
  }
}

/** Developerský provider: okamžité udělení/odebrání pro testování. */
export class DevProvider implements PurchaseProvider {
  readonly name = "dev";
  async init() {
    return getOwnedDlc();
  }
  async purchase(id: DlcId): Promise<PurchaseResult> {
    return { ok: true, owned: grantDlc(id), message: "🛠️ [dev] DLC odemčeno." };
  }
  async restore() {
    return getOwnedDlc();
  }
  async revoke(id: DlcId): Promise<DlcId[]> {
    return revokeDlc(id);
  }
}

export function getPurchaseProvider(dev: boolean): PurchaseProvider {
  // TODO (produkce): if (Capacitor.isNativePlatform()) return new CapacitorBillingProvider();
  return dev ? new DevProvider() : new WebPreviewProvider();
}
