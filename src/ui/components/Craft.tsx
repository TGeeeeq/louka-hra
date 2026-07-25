import { useGame } from "../store";
import { RECIPES } from "../../game/content/recipes";
import { ITEM_BY_ID } from "../../game/content/items";
import { invCount } from "../../game/engine/util";
import { Icon } from "../icons/Icon";
import { EmojiIcon } from "../icons/emojiMap";

export function Craft() {
  const { state, dispatch } = useGame();
  const inv = state.inventory;
  const hasSusarna = state.buildings.includes("susarna");
  const recipes = RECIPES;

  return (
    <div className="craft">
      <p className="panel-lead">
        <Icon name="flask" size={16} /> Výroba. Některé recepty potřebují oheň{" "}
        <span className={state.fireLit ? "fire on" : "fire off"}>
          <Icon name="fire" size={14} /> {state.fireLit ? "hoří" : "nehoří"}
        </span>
        . Rozdělej ho v záložce Práce (poledne).
      </p>
      {recipes.map((r) => {
        const haveAll = r.inputs.every((i) => invCount(inv, i.item) >= i.qty);
        const fireOk = !r.requiresFire || state.fireLit;
        const energyOk = state.energy >= r.energy;
        const usesHerbs = r.inputs.some((i) => i.item === "byliny" || i.item === "kvety" || i.item === "sipek");
        return (
          <div className="recipe" key={r.id}>
            <div className="recipe-head">
              <span className="recipe-ico">
                <EmojiIcon emoji={r.emoji} size={24} />
              </span>
              <b>{r.name}</b>
              <span className="recipe-energy">
                <Icon name="spark" size={14} />
                {r.energy}
              </span>
            </div>
            <p className="recipe-desc">{r.desc}</p>
            <div className="recipe-io">
              <span className="io in">
                {r.inputs.map((i) => (
                  <span key={i.item} className={invCount(inv, i.item) >= i.qty ? "ok" : "miss"}>
                    <EmojiIcon emoji={ITEM_BY_ID[i.item].emoji} size={15} />
                    {i.qty}× {ITEM_BY_ID[i.item].name}{" "}
                    <em>({invCount(inv, i.item)})</em>
                  </span>
                ))}
              </span>
              <span className="io-arrow" aria-hidden>
                <Icon name="arrowRight" size={18} />
              </span>
              <span className="io out">
                {r.outputs.map((o) => (
                  <span key={o.item}>
                    <EmojiIcon emoji={ITEM_BY_ID[o.item].emoji} size={15} />{" "}
                    {o.qty + (usesHerbs && hasSusarna ? 1 : 0)}× {ITEM_BY_ID[o.item].name}
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
              {!fireOk ? (
                <>
                  Potřebuješ oheň <Icon name="fire" size={15} />
                </>
              ) : !haveAll ? (
                "Chybí suroviny"
              ) : !energyOk ? (
                "Málo energie"
              ) : (
                "Vyrobit"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
