import { useState } from "react";
import { useGame } from "../store";
import { Icon } from "../icons/Icon";
import { Modal } from "./Modal";

export function GameOver() {
  const { state, dispatch } = useGame();
  const [bannerOk, setBannerOk] = useState(true);
  if (!state.gameOver) return null;
  // Schválně bez onClose: konec hry se nedá odklepnout pryč, jen "Hrát znovu".
  return (
    <Modal title="Konec hry" className="over-modal">
      {bannerOk && (
        <div className="over-banner-wrap">
          <img
            className="over-banner"
            src={`${import.meta.env.BASE_URL}ui/gameover.webp`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBannerOk(false)}
          />
        </div>
      )}
      <p className="over-msg">{state.gameOver}</p>
      <div className="over-stats">
        <div><b>{state.daysSurvived}</b><span>dní přežito</span></div>
        <div><b>{state.totalEarned}</b><span>Kč vyděláno</span></div>
        <div><b>{state.knownFacts.length}</b><span>zajímavostí</span></div>
      </div>
      <button className="big-btn" onClick={() => dispatch({ type: "RESET" })}>
        <Icon name="sprout" size={18} /> Hrát znovu
      </button>
    </Modal>
  );
}
