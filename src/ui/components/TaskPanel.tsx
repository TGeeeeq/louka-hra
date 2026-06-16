import type { ReactNode } from "react";
import { useGame } from "../store";
import type { Action } from "../../game/engine/reducer";
import { invCount } from "../../game/engine/util";

function Task({
  icon,
  label,
  hint,
  energy,
  done,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  hint?: ReactNode;
  energy?: number;
  done?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`task ${done ? "done" : ""}`} disabled={disabled || done} onClick={onClick}>
      <span className="task-ico" aria-hidden>
        {done ? "✅" : icon}
      </span>
      <span className="task-main">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <span className="task-cost">{done ? "hotovo" : energy != null ? `⚡${energy}` : ""}</span>
    </button>
  );
}

export function TaskPanel() {
  const { state, dispatch } = useGame();
  const d = (a: Action) => dispatch(a);
  const t = state.tasksDone;
  const inv = state.inventory;

  return (
    <div className="taskpanel">
      {state.phase === "rano" && (
        <>
          <p className="panel-lead">🌅 Ráno: vypusť drůbež, nakrm a napoj všechny, sesbírej vejce.</p>
          <Task
            icon="🐔"
            label="Vypustit drůbež"
            hint="Slepice, husy a kachny ven z kurníku"
            energy={4}
            done={state.birdsReleased || t.release}
            onClick={() => d({ type: "RELEASE_BIRDS" })}
          />
          <Task
            icon="🥣"
            label="Nakrmit drůbež"
            hint={`Krmná směs (${invCount(inv, "krmna_smes")} ks)`}
            energy={8}
            done={t.feed_drubez}
            disabled={!state.birdsReleased}
            onClick={() => d({ type: "FEED", group: "drubez" })}
          />
          <Task
            icon="🍲"
            label="Nakrmit prasata"
            hint={`Vařené krmivo (${invCount(inv, "vareno")} ks)`}
            energy={7}
            done={t.feed_prasata}
            onClick={() => d({ type: "FEED", group: "prasata" })}
          />
          <Task
            icon="🟨"
            label="Rozdělat seno stádu"
            hint={`Balík sena (${invCount(inv, "seno")} ks)`}
            energy={10}
            done={t.feed_stado}
            onClick={() => d({ type: "FEED", group: "stado" })}
          />
          <Task
            icon="🦴"
            label="Nakrmit psy, kočky, králíky"
            hint={`Granule (${invCount(inv, "granule")} ks)`}
            energy={5}
            done={t.feed_mazlici}
            onClick={() => d({ type: "FEED", group: "mazlici" })}
          />
          <Task
            icon="💧"
            label="Napojit zvířata"
            hint={state.buildings.includes("studna") ? "ze studny, zdarma" : "potřebuješ vodu"}
            energy={state.buildings.includes("studna") ? 0 : 5}
            done={t.water}
            onClick={() => d({ type: "WATER" })}
          />
          <Task
            icon="🥚"
            label="Sesbírat vejce"
            hint="ranní snůška na prodej"
            energy={4}
            done={t.eggs}
            disabled={!state.birdsReleased}
            onClick={() => d({ type: "COLLECT_EGGS" })}
          />
        </>
      )}

      {state.phase === "poledne" && (
        <>
          <p className="panel-lead">
            🌞 Poledne: úklid, dřevo a oheň, sběr bylin. Vyráběj v záložce Výroba, nakupuj v Obchodě.
          </p>
          <Task icon="🧹" label="Uklidit kurník a chlívek" energy={7} done={t.clean_kurnik} onClick={() => d({ type: "CLEAN", area: "kurnik" })} />
          <Task icon="🧽" label="Uklidit kuchyni a boudu" energy={5} done={t.clean_kuchyne} onClick={() => d({ type: "CLEAN", area: "kuchyne" })} />
          <Task
            icon="🔥"
            label={state.fireLit ? "Oheň hoří" : "Rozdělat oheň"}
            hint={state.fireLit ? "můžeš vařit" : `spálí 1 dřevo (máš ${invCount(inv, "drevo")})`}
            energy={2}
            done={state.fireLit}
            onClick={() => d({ type: "LIGHT_FIRE" })}
          />
          <Task icon="🪓" label="Naštípat dřevo" hint="zásoba na zimu" energy={state.buildings.includes("sekera") ? 7 : 9} onClick={() => d({ type: "CHOP_WOOD" })} />
          <Task icon="🌿" label="Sběr bylin v lese" hint="na mast a čaj · podle období" energy={8} onClick={() => d({ type: "FORAGE" })} />
          <Task
            icon="✂️"
            label="Ostříhat ovce"
            hint={state.season === "zima" ? "v zimě ne — vlna hřeje" : "vlna na prodej"}
            energy={8}
            done={t.shear}
            disabled={state.season === "zima"}
            onClick={() => d({ type: "SHEAR" })}
          />
        </>
      )}

      {state.phase === "vecer" && (
        <>
          <p className="panel-lead">🌇 Večer: dokrm zvířata a zavři je do bezpečí před nocí. Pak jdi spát.</p>
          <Task
            icon="🌾"
            label="Večerní dokrmení"
            hint="směs + vařené + granule"
            energy={9}
            done={t.evening_feed}
            onClick={() => d({ type: "EVENING_FEED" })}
          />
          <Task
            icon="🚪"
            label="Zavřít zvířata na noc"
            hint="ochrana před liškou"
            energy={4}
            done={t.closed}
            onClick={() => d({ type: "CLOSE_ANIMALS" })}
          />
          <p className="panel-note">
            Až budeš hotový, zmáčkni nahoře <b>Jít spát</b>. Spočítá se spokojenost, dary i útrata.
          </p>
        </>
      )}

      <div className="survival">
        <span className="survival-label">Postarej se i o sebe:</span>
        <div className="survival-btns">
          <button disabled={invCount(inv, "chleba") < 1} onClick={() => d({ type: "EAT", itemId: "chleba" })}>🍞 Chleba ({invCount(inv, "chleba")})</button>
          <button disabled={invCount(inv, "polevka") < 1} onClick={() => d({ type: "EAT", itemId: "polevka" })}>🥘 Polévka ({invCount(inv, "polevka")})</button>
          <button disabled={invCount(inv, "voda") < 1} onClick={() => d({ type: "DRINK", itemId: "voda" })}>💧 Voda ({invCount(inv, "voda")})</button>
          <button disabled={invCount(inv, "caj") < 1} onClick={() => d({ type: "DRINK", itemId: "caj" })}>🍵 Čaj ({invCount(inv, "caj")})</button>
        </div>
      </div>
    </div>
  );
}
