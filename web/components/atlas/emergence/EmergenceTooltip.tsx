import type { GridCell } from "@/lib/atlas/data/schema";
import { number } from "@/lib/atlas/format";
import { describeEmergence } from "@/lib/atlas/narrative";

const latText = (lat: number) => `${number(Math.abs(lat), 1)}° ${lat >= 0 ? "N" : "S"}`;
const lonText = (lon: number) => `${number(Math.abs(lon), 1)}° ${lon >= 0 ? "E" : "O"}`;

interface EmergenceTooltipProps {
  cell: GridCell;
  firstDataYear: number;
}

export function EmergenceTooltip({ cell, firstDataYear }: EmergenceTooltipProps) {
  return (
    <div className="map-tooltip emergence-tooltip" role="status">
      <div>
        {latText(cell.lat)} · {lonText(cell.lon)}
      </div>
      <strong>
        {cell.emergence !== null
          ? `Detectável desde ${cell.emergence}`
          : cell.yearsToDetect !== null
            ? `Faltam ~${cell.yearsToDetect} anos`
            : "Sem previsão"}
      </strong>
      <div>{describeEmergence(cell.emergence, cell.yearsToDetect, firstDataYear)}</div>
    </div>
  );
}
