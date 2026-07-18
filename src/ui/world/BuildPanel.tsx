import { useState } from "react";
import type { BuildCategory, Placed } from "../../game/types";
import { BUILDABLES } from "../../game/content/buildables";
import { hasBuilt } from "../../game/build/placement";

const TAB_LABEL: Record<BuildCategory, string> = {
  zaklad: "🏠 Základ",
  upgrade: "✨ Upgrady",
  ohrada: "🚧 Ohrady",
  dekorace: "🪧 Dekorace",
};

const TABS: BuildCategory[] = ["zaklad", "upgrade", "ohrada", "dekorace"];

const ICON: Record<string, string> = {
  chalupa: "🏠",
  stanek: "🏪",
  dilna: "🛠️",
  ohniste: "🔥",
  kurnik: "🐔",
  chlivek: "🐖",
  pastvina: "🐑",
  buda: "🐾",
  studna: "💧",
  zahrada: "🥕",
  plot: "🚧",
  cedule_deko: "🪧",
};

interface Props {
  money: number;
  wood: number;
  structures: Placed[];
  selection: string | null;
  onSelect: (defId: string | null) => void;
}

export function BuildPanel({ money, wood, structures, selection, onSelect }: Props) {
  const [tab, setTab] = useState<BuildCategory>("zaklad");
  const items = BUILDABLES.filter((b) => b.category === tab);

  return (
    <div className="build-panel">
      <div className="subtabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="shop-list build-panel-list">
        {items.map((b) => {
          const already = b.unique && hasBuilt(structures, b.id);
          const affordable =
            (!b.cost.money || money >= b.cost.money) && (!b.cost.wood || wood >= b.cost.wood);
          const disabled = already || !affordable;
          const on = selection === b.id;
          return (
            <div className={`shop-row build${already ? " owned" : ""}${disabled && !already ? " dim" : ""}${on ? " on" : ""}`} key={b.id}>
              <span className="shop-ico">{ICON[b.id] ?? "🔨"}</span>
              <span className="shop-info">
                <b>{b.label}</b>
                <small>{b.fw}×{b.fh} dlaždice</small>
              </span>
              <span className="shop-buy">
                {already ? (
                  <span className="owned-tag">✓ máš</span>
                ) : (
                  <button
                    disabled={!affordable}
                    onClick={() => onSelect(on ? null : b.id)}
                  >
                    {on ? "✓ vybráno" : [
                      b.cost.money ? `💰${b.cost.money}` : null,
                      b.cost.wood ? `🪵${b.cost.wood}` : null,
                    ].filter(Boolean).join(" ") || "zdarma"}
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <p className="panel-note">
        {selection ? "Klepni na louku, kam to postavit." : "Vyber si stavbu a pak klepni na louku."}
      </p>
    </div>
  );
}
