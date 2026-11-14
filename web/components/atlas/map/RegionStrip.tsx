import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Region, VariableMeta } from "@/lib/atlas/data/schema";
import { formatP, signed } from "@/lib/atlas/format";

interface RegionStripProps {
  regions: readonly Region[];
  variable: VariableMeta;
  selectedId: string | null;
  onSelect: (region: Region) => void;
}

export function RegionStrip({ regions, variable, selectedId, onSelect }: RegionStripProps) {
  return (
    <div className="region-strip">
      {regions.map((region) => (
        <Button
          variant="region"
          key={region.id}
          aria-pressed={selectedId === region.id}
          onClick={() => onSelect(region)}
        >
          <span className="region-name">{region.name}</span>
          <span className={region.trend < 0 ? "text-trend-down" : "text-trend-up"}>
            {signed(region.trend, variable.decimals)}{" "}
            <span className="region-unit">{variable.unit}/déc.</span>
          </span>
          <span className="region-p">p {formatP(region.p)}</span>
          <ArrowUpRight />
        </Button>
      ))}
    </div>
  );
}
