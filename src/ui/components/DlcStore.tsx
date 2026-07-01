import { useState } from "react";
import { useGame } from "../store";
import { DLC_CATALOG } from "../../game/content/dlc";
import { getPurchaseProvider } from "../../game/dlc/purchase";
import { sound } from "../../audio/sound";

/**
 * Obchod s rozšířeními. Na webu jen náhled (bez platební brány) — nákupy
 * dorazí s mobilní verzí přes Capacitor billing. Dev mód umí odemknout hned.
 */
export function DlcStore() {
  const { state, dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const provider = getPurchaseProvider(state.dev.enabled);

  const buy = async (id: (typeof DLC_CATALOG)[number]["id"]) => {
    const r = await provider.purchase(id);
    if (r.ok) {
      dispatch({ type: "SET_DLC", owned: r.owned });
      sound.questDone();
      setNote(`🎉 ${r.message ?? "Rozšíření odemčeno!"}`);
    } else {
      setNote(r.message ?? "Nákup se nepovedl.");
    }
  };

  return (
    <div className="dlc-store">
      <p className="panel-lead">
        Louka je poctivá hra bez reklam. Rozšíření přidávají nové příběhy —
        a <b>každý nákup je skutečná podpora azylu Nech mě růst</b>. 💚
      </p>
      {DLC_CATALOG.map((d) => {
        const owned = state.dlcOwned.includes(d.id);
        return (
          <div className={`dlc-card ${owned ? "owned" : ""}`} key={d.id}>
            <div className="dlc-head">
              <span className="dlc-emoji">{d.emoji}</span>
              <div>
                <h3>{d.name}</h3>
                <em>{d.tagline}</em>
              </div>
              {owned ? (
                <span className="owned-tag">✓ Aktivní</span>
              ) : (
                <button className="big-btn dlc-buy" onClick={() => void buy(d.id)}>
                  {d.priceCzk} Kč
                </button>
              )}
            </div>
            <p className="dlc-desc">{d.desc}</p>
            <ul className="dlc-features">
              {d.features.map((f) => (
                <li key={f}>🌱 {f}</li>
              ))}
            </ul>
          </div>
        );
      })}
      {note && <p className="panel-note dlc-note">{note}</p>}
      <p className="panel-note">
        Základní hra vyjde na Google Play a App Store za 150 Kč. Rozšíření se
        dokupují uvnitř aplikace — a nákupy přežijí i novou hru od začátku.
      </p>
    </div>
  );
}
