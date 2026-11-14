import type { GridCell, VariableMeta } from "@/lib/atlas/data/schema";
import { formatP, number, signed } from "@/lib/atlas/format";
import { SIGNIFICANCE_MODES, isSignificant, type SignificanceMode } from "@/lib/atlas/scale";

interface MapTooltipProps {
  cell: GridCell;
  mode: SignificanceMode;
  variable: VariableMeta;
}

const latText = (lat: number) => `${number(Math.abs(lat), 1)}° ${lat >= 0 ? "N" : "S"}`;
const lonText = (lon: number) => `${number(Math.abs(lon), 1)}° ${lon >= 0 ? "E" : "O"}`;

export function MapTooltip({ cell, mode, variable }: MapTooltipProps) {
  const significant = isSignificant(cell, mode);
  return (
    <div className="map-tooltip" role="status">
      <div>
        {latText(cell.lat)} · {lonText(cell.lon)}
      </div>
      <strong>
        {cell.trend >= 0 ? "↑" : "↓"} {signed(cell.trend, variable.decimals)} {variable.trendUnit}
      </strong>
      <div>
        IC 95% [{signed(cell.ci[0], variable.decimals)}; {signed(cell.ci[1], variable.decimals)}]
      </div>
      <div>
        p {formatP(cell.p)} · {significant ? "significativa" : "não significativa"}
        <span className="tooltip-mode"> ({SIGNIFICANCE_MODES[mode].label})</span>
      </div>
    </div>
  );
}
