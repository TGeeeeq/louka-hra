import { useEffect } from "react";
import { useGame } from "../store";
import { Icon } from "../icons/Icon";
import { PEOPLE, type PersonDef } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { personPhotoUrl } from "../photo";

// Jméno → PersonDef pro známé lidi z týmu (hráč "Ty" se řeší zvlášť níž,
// podoba jde z jeho vlastního profilu, ne z tohoto katalogu).
const PERSON_BY_NAME: Record<string, PersonDef> = Object.fromEntries(
  PEOPLE.filter((p) => p.id !== "ty").map((p) => [p.name, p]),
);

/**
 * `hidden` = replika je ve frontě, ale zatím se nemá zobrazit (běží uvítací
 * přelet kamery). Musí blokovat i klávesy, jinak by hráč mezerníkem odklikal
 * Tomášovo vysvětlení, aniž by ho vůbec viděl.
 */
export function DialogBox({ hidden = false }: { hidden?: boolean }) {
  const { state, dispatch } = useGame();
  const d = hidden ? null : state.dialog;

  useEffect(() => {
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        dispatch({ type: "DISMISS_DIALOG" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d, dispatch]);

  if (!d) return null;
  const more = d.lines.length > 1;

  // Kdo mluví? Buď hráč sám (jménem z jeho profilu, nebo výchozím "Ty"),
  // nebo někdo z týmu (Tomáš/Maruška/Tony) — jinak (Tip, Louka, zvířata…)
  // se portrét nezobrazuje, jako dosud.
  const isPlayer = !!d.speaker && (d.speaker === state.profile.name || d.speaker === "Ty");
  const speakerPerson: PersonDef | undefined = isPlayer
    ? { id: "ty", name: state.profile.name, role: "", line: "", ...state.profile.appearance }
    : d.speaker
      ? PERSON_BY_NAME[d.speaker]
      : undefined;
  const speakerPhoto = speakerPerson && !isPlayer ? personPhotoUrl(speakerPerson) : null;

  return (
    <div className="dialog-layer" onClick={() => dispatch({ type: "DISMISS_DIALOG" })}>
      <div className="dialog-box paper" onClick={(e) => e.stopPropagation()}>
        {d.speaker && (
          <div className="dialog-head">
            {speakerPerson && (
              <span className="dialog-portrait">
                {speakerPhoto ? (
                  <img src={speakerPhoto} alt={d.speaker} width={44} height={44} />
                ) : (
                  <PersonSprite person={speakerPerson} size={44} />
                )}
              </span>
            )}
            <span className="dialog-speaker">{d.speaker}</span>
          </div>
        )}
        <p className="dialog-text">{d.lines[0]}</p>
        <button className="dialog-next" onClick={() => dispatch({ type: "DISMISS_DIALOG" })}>
          <Icon name="chevronDown" size={14} /> {more ? "dál" : "zavřít"}
        </button>
      </div>
    </div>
  );
}
