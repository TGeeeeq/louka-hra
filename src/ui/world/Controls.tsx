import { input, queueAction } from "../../world/input";
import { sound } from "../../audio/sound";

type Dir = "up" | "down" | "left" | "right";

function hold(dir: Dir) {
  const off = () => {
    input[dir] = false;
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      input[dir] = true;
    },
    onPointerUp: off,
    onPointerLeave: off,
    onPointerCancel: off,
  };
}

export function Controls() {
  return (
    <div className="touch-controls">
      <div className="dpad">
        <button className="dp up" aria-label="nahoru" {...hold("up")}>▲</button>
        <button className="dp left" aria-label="vlevo" {...hold("left")}>◀</button>
        <button className="dp right" aria-label="vpravo" {...hold("right")}>▶</button>
        <button className="dp down" aria-label="dolů" {...hold("down")}>▼</button>
      </div>
      <button
        className="abtn"
        aria-label="akce"
        onPointerDown={(e) => {
          e.preventDefault();
          queueAction();
          sound.select();
        }}
      >
        A
      </button>
    </div>
  );
}
