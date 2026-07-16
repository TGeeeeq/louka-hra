// D7 — Google Play Billing (cordova-plugin-purchase v13) pro odemčení plné
// verze. Plugin je nativní (Cordova) a napojuje se do Android shellu přes
// Capacitor (`npx cap sync android`); v prohlížeči neexistuje vůbec.
//
// Proč `(window as any).CdvPurchase` a ne `import`:
// npm balíček `cordova-plugin-purchase` je v package.json jen proto, aby ho
// `cap sync` nakopíroval a zaregistroval jako nativní Android plugin. Jeho
// typy jsou obrovské (viz node_modules/cordova-plugin-purchase/www/store.d.ts)
// a hlavně: `CdvPurchase` je globální proměnná, kterou za běhu vytvoří
// injektovaný plugin JS jen na nativní platformě. Web bundle o něm nemá vědět
// vůbec nic — proto jen tenký lokální typ pro to málo, co skutečně voláme.
//
// ── Než tohle na Google Play zafunguje (Play Console) ──────────────────────
// 1. Aplikace cz.nechmerust.louka musí v Play Console existovat a mít nahraný
//    aspoň jeden build (stačí interní testování — bez uploadu build nejde
//    testovat žádný in-app nákup).
// 2. V sekci Monetizace → Produkty musí existovat spravovaný produkt s ID
//    přesně `cz.nechmerust.louka.full` (viz FULL_VERSION.storeIds.googlePlay)
//    a musí být ve stavu Aktivní.
// 3. Testovací účty (licenční testeři, Nastavení → Testování licencí, nebo
//    tester emaily na interní/uzavřené testovací trati) — jinak nákup buď
//    nejde spustit, nebo se chová jako v produkci a reálně strhne peníze.
// 4. Transakci je nutné do 3 dnů potvrdit/dokončit (u nás `transaction.finish()`
//    po `grantFull()`) — jinak ji Google Play automaticky vrátí a nákup zruší.
//    Proto handler na `approved` běží persistentně od `init()`, ne jen během
//    jednoho volání `purchase()` (transakce může dorazit i mimo něj — např.
//    uplatněný kupón, nedokončený nákup z minulé session apod.).
import { grantFull, hasFullVersion } from "./entitlements";
import { FULL_VERSION } from "../content/fullVersion";
import { WebPreviewProvider, type PurchaseProvider, type PurchaseResult } from "./purchase";

const FULL_ID = FULL_VERSION.storeIds?.googlePlay ?? "cz.nechmerust.louka.full";

// ── Minimální lokální typování CdvPurchase v13 (jen to, co používáme) ──────
interface CdvError {
  isError: true;
  code: number;
  message: string;
}
interface CdvTransaction {
  products: { id: string }[];
  finish(): Promise<void>;
}
interface CdvOffer {
  order(): Promise<CdvError | undefined>;
}
interface CdvProduct {
  id: string;
  getOffer(id?: string): CdvOffer | undefined;
}
interface CdvWhen {
  approved(cb: (t: CdvTransaction) => void): CdvWhen;
  receiptUpdated(cb: (r: unknown) => void): CdvWhen;
}
interface CdvStore {
  register(products: { id: string; type: string; platform: string }[]): void;
  initialize(platforms: string[]): Promise<CdvError[]>;
  when(): CdvWhen;
  off(cb: (...args: unknown[]) => void): void;
  get(id: string, platform?: string): CdvProduct | undefined;
  owned(id: string): boolean;
  restorePurchases(): Promise<CdvError | undefined>;
}
interface CdvPurchaseGlobal {
  store: CdvStore;
  ProductType: { NON_CONSUMABLE: string };
  Platform: { GOOGLE_PLAY: string };
  ErrorCode: { PAYMENT_CANCELLED: number };
}

function getCdv(): CdvPurchaseGlobal | undefined {
  try {
    return (window as unknown as { CdvPurchase?: CdvPurchaseGlobal }).CdvPurchase;
  } catch {
    return undefined;
  }
}

/**
 * Google Play Billing provider (cordova-plugin-purchase v13).
 *
 * Tok událostí:
 *  1. `init()` (idempotentní, i opakovaná volání vrací stejný běžící slib):
 *     zaregistruje produkt `cz.nechmerust.louka.full` jako NON_CONSUMABLE na
 *     GOOGLE_PLAY, nastaví trvalý listener na `approved` (a `receiptUpdated`
 *     pro průběžnou synchronizaci vlastnictví) a zavolá `store.initialize()`.
 *     Vrací aktuální vlastnictví (pro restore-on-start po reinstalaci).
 *  2. `approved` handler: bez validačního serveru — místo `transaction.verify()`
 *     (což vyžaduje vzdálenou validační službu, kterou hra nemá) provedeme
 *     lokální ověření: transakce musí obsahovat náš produkt. Pokud ano,
 *     `grantFull()` (zápis do localStorage/Preferences) a hned nato
 *     `transaction.finish()` — Google Play tak transakci nevrátí (viz 3denní
 *     limit výše).
 *  3. `purchase()`: najde nabídku a zavolá `store.order()`. Zrušení nákupu
 *     (ErrorCode.PAYMENT_CANCELLED) vrátí `ok:false` se slušnou zprávou, nikdy
 *     nevyhazuje výjimku. Po úspěšném `order()` ještě chvíli (s timeoutem)
 *     počká na `receiptUpdated`, aby `PurchaseResult.owned` bylo spolehlivé i
 *     když `approved` handler doběhne až po vyřešení promisu z `order()`.
 *  4. `restore()`: `store.restorePurchases()` a přečtení aktuálního
 *     vlastnictví.
 *
 * Defenzivně: chybí-li `CdvPurchase` (web, nebo nativní build bez pluginu),
 * chová se úplně stejně jako `WebPreviewProvider` — nikdy nevyhodí a nikdy
 * nenechá viset nevyřešený Promise.
 */
export class CapacitorBillingProvider implements PurchaseProvider {
  readonly name = "google-play";
  private readonly cdv = getCdv();
  private readonly fallback = new WebPreviewProvider();
  private initPromise: Promise<boolean> | null = null;

  private available(): boolean {
    return !!this.cdv;
  }

  async init(): Promise<boolean> {
    if (!this.available()) return this.fallback.init();
    if (!this.initPromise) this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    const cdv = this.cdv;
    if (!cdv) return hasFullVersion();
    try {
      const { store, ProductType, Platform } = cdv;
      store.register([{ id: FULL_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.GOOGLE_PLAY }]);
      store
        .when()
        .approved((transaction) => {
          void this.handleApproved(transaction);
        })
        .receiptUpdated(() => {
          this.syncOwnership();
        });
      await store.initialize([Platform.GOOGLE_PLAY]);
      this.syncOwnership();
    } catch {
      // Inicializace pluginu selhala (např. Play Services nedostupné) —
      // bereme to jako "zatím nevlastní", UI zůstane funkční (web fallback
      // text i tak vysvětlí nákup přes Play).
    }
    return hasFullVersion();
  }

  /** Přečte aktuální vlastnictví z pluginu a zrcadlí ho do entitlements. */
  private syncOwnership(): boolean {
    try {
      if (this.cdv?.store.owned(FULL_ID)) grantFull();
    } catch {
      /* store.owned() selhalo — necháme localStorage rozhodovat */
    }
    return hasFullVersion();
  }

  private async handleApproved(transaction: CdvTransaction): Promise<void> {
    try {
      const isOurs = transaction.products.some((p) => p.id === FULL_ID);
      if (isOurs) grantFull();
      // Bez vlastního validačního serveru: lokální kontrola produktu výš je
      // naše "verify". `finish()` MUSÍ proběhnout (do 3 dnů), jinak Google
      // Play nákup automaticky vrátí.
      await transaction.finish();
    } catch {
      /* finish() selhalo — Play transakci doručí znovu při dalším startu */
    }
  }

  /** Po úspěšném order() chvíli počká, než se vlastnictví promítne (event
   * `receiptUpdated` může doběhnout až po vyřešení promisu z `order()`). Nikdy
   * nezůstane viset — má vlastní timeout. */
  private waitForOwnership(timeoutMs = 4000): Promise<boolean> {
    if (hasFullVersion()) return Promise.resolve(true);
    const cdv = this.cdv;
    if (!cdv) return Promise.resolve(hasFullVersion());
    return new Promise((resolve) => {
      let settled = false;
      const onReceipt = () => {
        if (settled || !hasFullVersion()) return;
        settled = true;
        clearTimeout(timer);
        try {
          cdv.store.off(onReceipt);
        } catch {
          /* ignore */
        }
        resolve(true);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          cdv.store.off(onReceipt);
        } catch {
          /* ignore */
        }
        resolve(hasFullVersion());
      }, timeoutMs);
      try {
        cdv.store.when().receiptUpdated(onReceipt);
      } catch {
        settled = true;
        clearTimeout(timer);
        resolve(hasFullVersion());
      }
    });
  }

  async purchase(): Promise<PurchaseResult> {
    if (!this.available()) return this.fallback.purchase();
    try {
      await this.init();
      const cdv = this.cdv;
      if (!cdv) return this.fallback.purchase();
      const product = cdv.store.get(FULL_ID, cdv.Platform.GOOGLE_PLAY);
      const offer = product?.getOffer();
      if (!offer) {
        return {
          ok: false,
          owned: hasFullVersion(),
          message:
            "Produkt zatím není na Google Play připravený ke koupi. Zkus to prosím za chvíli znovu.",
        };
      }
      const err = await offer.order();
      if (err) {
        if (err.code === cdv.ErrorCode.PAYMENT_CANCELLED) {
          return { ok: false, owned: hasFullVersion(), message: "Nákup zrušen." };
        }
        return {
          ok: false,
          owned: hasFullVersion(),
          message: "Nákup se nepovedl. Zkus to prosím znovu.",
        };
      }
      const owned = await this.waitForOwnership();
      return {
        ok: owned,
        owned,
        message: owned
          ? "Plná verze odemčena! Děkujeme za podporu azylu 💚"
          : "Nákup proběhl, ale odemčení se zpožďuje — zkus prosím Obnovit dřívější nákup.",
      };
    } catch {
      return { ok: false, owned: hasFullVersion(), message: "Nákup se nepovedl. Zkus to prosím znovu." };
    }
  }

  async restore(): Promise<boolean> {
    if (!this.available()) return this.fallback.restore();
    try {
      await this.init();
      await this.cdv?.store.restorePurchases();
      return this.syncOwnership();
    } catch {
      return hasFullVersion();
    }
  }
}
