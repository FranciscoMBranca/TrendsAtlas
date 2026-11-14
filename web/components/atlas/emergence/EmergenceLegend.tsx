import { NOT_YET_FILL, emergenceColor } from "@/lib/atlas/emergence";

import type { EmergenceView } from "./EmergenceMap";
import { emergenceLegendItems } from "./EmergenceMap";

interface EmergenceLegendProps {
  view: EmergenceView;
  firstYear: number;
  lastYear: number;
}

export function EmergenceLegend({ view, firstYear, lastYear }: EmergenceLegendProps) {
  const items = emergenceLegendItems(view, firstYear, lastYear);
  if (items.gradient) {
    const stops = [firstYear, firstYear + (lastYear - firstYear) / 2, lastYear].map((y) =>
      emergenceColor(y, firstYear, lastYear),
    );
    return (
      <div className="map-legend emergence-legend">
        <div className="legend-scale">
          <div className="legend-directions">
            <span>← Emergiu cedo</span>
            <span>Emergiu tarde →</span>
          </div>
          <div
            className="legend-bar"
            style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }}
          />
          <div className="legend-values">
            <span>{items.first}</span>
            <span>{items.last}</span>
          </div>
          <p>ano em que passou a ser detectável</p>
        </div>
        <div className="stippling-key">
          <span className="swatch" style={{ background: NOT_YET_FILL }} />
          <span>Ainda não detectável</span>
        </div>
      </div>
    );
  }
  return (
    <ul className="map-legend swatch-legend" aria-label="Anos até detectar">
      {items.swatches.map((item) => (
        <li key={item.label}>
          <span className="swatch" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
