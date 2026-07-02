import { useState } from "react";
import { useGame } from "../store";
import { BUYABLE, SELLABLE } from "../../game/content/items";
import { BUILDINGS } from "../../game/content/buildings";
import { ownedOnly } from "../../game/dlc/gate";
import { invCount } from "../../game/engine/util";

type Tab = "nakup" | "prodej" | "stavby";

export function Shop() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<Tab>("nakup");

  const senoDiscount = state.buildings.includes("senik");
  const buyable = ownedOnly(state, BUYABLE);
  const sellable = ownedOnly(state, SELLABLE);
  const buildings = ownedOnly(state, BUILDINGS);

  return (
    <div className="shop">
      <div className="subtabs">
        <button className={tab === "nakup" ? "on" : ""} onClick={() => setTab("nakup")}>🛒 Nákup</button>
        <button className={tab === "prodej" ? "on" : ""} onClick={() => setTab("prodej")}>💱 Prodej</button>
        <button className={tab === "stavby" ? "on" : ""} onClick={() => setTab("stavby")}>🏗️ Stavby</button>
      </div>

      {tab === "nakup" && (
        <div className="shop-list">
          {buyable.map((it) => {
            const price =
              it.id === "seno" && senoDiscount ? Math.round(it.buyPrice! * 0.7) : it.buyPrice!;
            return (
              <div className="shop-row" key={it.id}>
                <span className="shop-ico">{it.emoji}</span>
                <span className="shop-info">
                  <b>{it.name}</b>
                  <small>{it.desc}</small>
                </span>
                <span className="shop-have">×{invCount(state.inventory, it.id)}</span>
                <span className="shop-price">
                  {price} Kč
                  {it.id === "seno" && senoDiscount && <em className="cut"> (seník)</em>}
                </span>
                <span className="shop-buy">
                  <button disabled={state.money < price} onClick={() => dispatch({ type: "BUY", itemId: it.id, qty: 1 })}>+1</button>
                  <button disabled={state.money < price * 5} onClick={() => dispatch({ type: "BUY", itemId: it.id, qty: 5 })}>+5</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "prodej" && (
        <div className="shop-list">
          {sellable.map((it) => {
            const have = invCount(state.inventory, it.id);
            return (
              <div className={`shop-row ${have ? "" : "dim"}`} key={it.id}>
                <span className="shop-ico">{it.emoji}</span>
                <span className="shop-info">
                  <b>{it.name}</b>
                  <small>{it.desc}</small>
                </span>
                <span className="shop-have">×{have}</span>
                <span className="shop-price">{it.sellPrice} Kč/ks</span>
                <span className="shop-buy">
                  <button disabled={have < 1} onClick={() => dispatch({ type: "SELL", itemId: it.id, qty: 1 })}>−1</button>
                  <button disabled={have < 1} onClick={() => dispatch({ type: "SELL", itemId: it.id, qty: have })}>vše</button>
                </span>
              </div>
            );
          })}
          <p className="panel-note">Nejlépe se prodává řebříčková mast 🪻 — vyrob ji z bylin v záložce Výroba.</p>
        </div>
      )}

      {tab === "stavby" && (
        <div className="shop-list">
          {buildings.map((b) => {
            const owned = state.buildings.includes(b.id);
            return (
              <div className={`shop-row build ${owned ? "owned" : ""}`} key={b.id}>
                <span className="shop-ico">{b.emoji}</span>
                <span className="shop-info">
                  <b>{b.name}</b>
                  <small>{b.desc}</small>
                  <em className="benefit">✨ {b.benefit}</em>
                </span>
                <span className="shop-buy">
                  {owned ? (
                    <span className="owned-tag">✓ máš</span>
                  ) : (
                    <button disabled={state.money < b.cost} onClick={() => dispatch({ type: "BUILD", buildingId: b.id })}>
                      {b.cost} Kč
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
