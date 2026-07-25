import { useState } from "react";
import { useGame } from "../store";
import { FULL_VERSION } from "../../game/content/fullVersion";
import { getPurchaseProvider } from "../../game/entitlement/purchase";
import { sound } from "../../audio/sound";
import { Icon } from "../icons/Icon";
import { EmojiIcon } from "../icons/emojiMap";

/**
 * Obrazovka plné verze. Na webu jen náhled (bez platební brány) — nákup
 * dorazí s mobilní verzí přes Capacitor billing. Dev mód umí odemknout hned.
 *
 * `demo`: obrazovka se otevřela přes demo bránu (C3 — hráč došel na konec
 * demo úseku a zkusil jít spát) — zobrazí navíc vysvětlující nadpis. Po
 * úspěšném nákupu (SET_FULL_VERSION) brána hned zmizí a spánek jde znovu.
 */
export function FullVersion({ demo = false }: { demo?: boolean }) {
  const { state, dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const provider = getPurchaseProvider(state.dev.enabled);
  const owned = state.fullVersion;

  const buy = async () => {
    const r = await provider.purchase();
    if (r.ok) {
      dispatch({ type: "SET_FULL_VERSION", full: r.owned });
      sound.questDone();
      setNote(`🎉 ${r.message ?? "Plná verze odemčena!"}`);
    } else {
      setNote(r.message ?? "Nákup se nepovedl.");
    }
  };

  const restore = async () => {
    const full = await provider.restore();
    dispatch({ type: "SET_FULL_VERSION", full });
    setNote(full ? "✅ Nákup obnoven — plnou verzi máš." : "Žádný dřívější nákup se nenašel.");
  };

  return (
    <div className="fullver">
      {demo && !owned && (
        <h3 className="fullver-demo-title">
          Demo končí — Louka pokračuje v plné verzi <Icon name="heart" size={17} className="ic-heart" />
        </h3>
      )}
      <div className="fullver-banner" aria-hidden>
        <span className="fullver-sun" />
        <span className="fullver-hill fullver-hill-back" />
        <span className="fullver-hill fullver-hill-front" />
        <span className="fullver-flower" style={{ left: "18%" }}><Icon name="flower" size={20} /></span>
        <span className="fullver-flower" style={{ left: "38%" }}><Icon name="wheat" size={20} /></span>
        <span className="fullver-flower" style={{ left: "58%" }}><Icon name="flower" size={18} /></span>
        <span className="fullver-flower" style={{ left: "78%" }}><Icon name="leaf" size={20} /></span>
      </div>

      <p className="panel-lead">
        Louka je poctivá hra bez reklam. Tahle bezplatná verze je demo — tutoriál a první dny na
        Louce. Plnou verzí odemkneš zbytek natrvalo a <b>skutečně podpoříš azyl Nech mě růst</b>.{" "}
        <Icon name="heart" size={15} className="ic-heart" />
      </p>

      <div className={`fullver-card ${owned ? "owned" : ""}`}>
        <div className="fullver-head">
          <span className="fullver-emoji">
            <EmojiIcon emoji={FULL_VERSION.emoji} size={34} />
          </span>
          <div>
            <h3>{FULL_VERSION.name}</h3>
            <em>{FULL_VERSION.tagline}</em>
          </div>
          {owned ? (
            <span className="owned-tag">
              <Icon name="check" size={15} /> Máš
            </span>
          ) : (
            <button className="big-btn fullver-buy" onClick={() => void buy()}>
              {FULL_VERSION.priceCzk} Kč
            </button>
          )}
        </div>
        <p className="fullver-desc">{FULL_VERSION.desc}</p>
        <ul className="fullver-features">
          {FULL_VERSION.features.map((f) => (
            <li key={f}>
              <Icon name="sprout" size={15} className="ic-good" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {!owned && (
        <button className="fullver-restore" onClick={() => void restore()}>
          Obnovit dřívější nákup
        </button>
      )}

      {note && <p className="panel-note fullver-note">{note}</p>}

      {!state.dev.enabled && (
        <p className="panel-note">
          Na webu zatím nákup nejde dokončit — plná verze dorazí s aplikací pro Android (Google
          Play). Zatím můžeš azyl podpořit přímo na{" "}
          <a href="https://nechmerust.org" target="_blank" rel="noreferrer">
            nechmerust.org
          </a>
          . <Icon name="heart" size={14} className="ic-heart" />
        </p>
      )}
    </div>
  );
}
