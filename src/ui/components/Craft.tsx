import { useGame } from "../store";
import { RECIPES } from "../../game/content/recipes";
import { ITEM_BY_ID } from "../../game/content/items";
import { ownedOnly } from "../../game/dlc/gate";
import { invCount } from "../../game/engine/util";

export function Craft() {
  const { state, dispatch } = useGame();
  const inv = state.inventory;
  const hasSusarna = state.buildings.includes("susarna");
  const recipes = ownedOnly(state, RECIPES);

  return (
    <div className="craft">
      <p className="panel-lead">
        🧪 Výroba. Některé recepty potřebují oheň{" "}
        <span className={state.fireLit ? "fire on" : "fire off"}>{state.fireLit ? "🔥 hoří" : "🔥 nehoří"}</span>.
        Rozdělej ho v záložce Práce (poledne).
      </p>
      {recipes.map((r) => {
        const haveAll = r.inputs.every((i) => invCount(inv, i.item) >= i.qty);
        const fireOk = !r.requiresFire || state.fireLit;
        const energyOk = state.energy >= r.energy;
        const usesHerbs = r.inputs.some((i) => i.item === "byliny" || i.item === "kvety" || i.item === "sipek");
        return (
          <div className="recipe" key={r.id}>
            <div className="recipe-head">
              <span className="recipe-ico">{r.emoji}</span>
              <b>{r.name}</b>
              <span className="recipe-energy">⚡{r.energy}</span>
            </div>
            <p className="recipe-desc">{r.desc}</p>
            <div className="recipe-io">
              <span className="io in">
                {r.inputs.map((i) => (
                  <span key={i.item} className={invCount(inv, i.item) >= i.qty ? "ok" : "miss"}>
                    {ITEM_BY_ID[i.item].emoji}
                    {i.qty}× {ITEM_BY_ID[i.item].name}{" "}
                    <em>({invCount(inv, i.item)})</em>
                  </span>
                ))}
              </span>
              <span className="io-arrow">→</span>
              <span className="io out">
                {r.outputs.map((o) => (
                  <span key={o.item}>
                    {ITEM_BY_ID[o.item].emoji} {o.qty + (usesHerbs && hasSusarna ? 1 : 0)}× {ITEM_BY_ID[o.item].name}
                  </span>
                ))}
                {usesHerbs && hasSusarna && <em className="bonus"> +1 sušárna</em>}
              </span>
            </div>
            <button
              className="recipe-btn"
              disabled={!haveAll || !fireOk || !energyOk}
              onClick={() => dispatch({ type: "CRAFT", recipeId: r.id })}
            >
              {!fireOk ? "Potřebuješ oheň 🔥" : !haveAll ? "Chybí suroviny" : !energyOk ? "Málo energie" : "Vyrobit"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
