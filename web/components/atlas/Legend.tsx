import type { VariableMeta } from "@/lib/atlas/data/schema";
import { number } from "@/lib/atlas/format";
import { SIGNIFICANCE_MODES, type SignificanceMode } from "@/lib/atlas/scale";

interface LegendProps {
  extent: number;
  mode: SignificanceMode;
  variable: VariableMeta;
}

/** Casas decimais do extremo da escala: uma escala de 0,02 não cabe em 1 casa. */
const scaleDigits = (extent: number) =>
  extent >= 10 ? 0 : extent >= 1 ? 1 : extent >= 0.1 ? 2 : 3;

export function Legend({ extent, mode, variable }: LegendProps) {
  return (
    <div className="map-legend">
      <div className="legend-scale">
        <div className="legend-directions">
          <span>← {variable.copy.down}</span>
          <span>{variable.copy.up} →</span>
        </div>
        <div className="legend-bar" />
        <div className="legend-values">
          <span>−{number(extent, scaleDigits(extent))}</span>
          <span>0</span>
          <span>+{number(extent, scaleDigits(extent))}</span>
        </div>
        <p>{variable.trendUnit}</p>
      </div>
      <div className="stippling-key">
        <span className="dot-sample" />
        <span>
          Tendência significativa
          <br />
          <span className="text-muted-foreground">{SIGNIFICANCE_MODES[mode].legend}</span>
        </span>
      </div>
    </div>
  );
}
