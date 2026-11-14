import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AtlasMeta } from "@/lib/atlas/data/schema";
import { number } from "@/lib/atlas/format";

const AXIS_TICK = { fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" };

interface EmergenceChartProps {
  emergence: AtlasMeta["emergence"];
  /** Ano seleccionado no mapa; desenha uma linha vertical. */
  year: number;
}

/**
 * Que fracção do planeta tem tendência detectável, ano a ano.
 * A linha tracejada é o nível que o puro acaso produziria: o sinal só conta acima dela.
 */
export function EmergenceChart({ emergence, year }: EmergenceChartProps) {
  return (
    <div
      className="anomaly-chart"
      role="img"
      aria-label="Percentagem da área do planeta com tendência detectável em cada ano, comparada com o nível esperado só por acaso"
      style={{ height: 260 }}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={emergence.byYear} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={AXIS_TICK}
            allowDecimals={false}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            tick={AXIS_TICK}
          />
          <ReferenceLine
            y={emergence.chanceLevelPct}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: "nível do acaso",
              position: "insideBottomRight",
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />
          <ReferenceLine x={year} stroke="var(--trend-down)" strokeWidth={1.5} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as
                AtlasMeta["emergence"]["byYear"][number] | undefined;
              if (!active || !row) return null;
              return (
                <div className="chart-tooltip">
                  <div>{row.year}</div>
                  <strong>{number(row.pctEmerged, 1)}% já detectável</strong>
                  <div>com FDR: {number(row.pctEmergedFdr, 1)}%</div>
                  <div>visto nesse ano: {number(row.pctSeen, 1)}%</div>
                </div>
              );
            }}
          />
          <Line
            dataKey="pctSeen"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.6}
            strokeWidth={1.2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="pctEmerged"
            stroke="var(--primary)"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="pctEmergedFdr"
            stroke="var(--primary)"
            strokeWidth={1.6}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
