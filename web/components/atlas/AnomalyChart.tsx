import { useMemo } from "react";
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

import type { MonthlyPoint } from "@/lib/atlas/data/schema";
import { number, signed } from "@/lib/atlas/format";
import { senLine } from "@/lib/atlas/stats/mann-kendall";
import { movingAverage } from "@/lib/atlas/stats/series";

interface AnomalyChartProps {
  series: readonly MonthlyPoint[];
  /** Altura em píxeis. */
  height: number;
  /** Versão pequena: sem eixos nem grelha, para cartões. */
  compact?: boolean;
  /** Descrição para leitores de ecrã. */
  label: string;
  /** Unidade e casas decimais do tooltip. */
  unit?: string;
  decimals?: number;
}

interface Row {
  t: number;
  date: string;
  anomaly: number;
  smooth: number | null;
  trend: number;
}

const SMOOTH_WINDOW = 12;
const TICK_EVERY_MONTHS = 60;

/** Anomalias mensais + média móvel de 12 meses + recta de Sen. */
export function AnomalyChart({
  series,
  height,
  compact = false,
  label,
  unit = "",
  decimals = 2,
}: AnomalyChartProps) {
  const rows = useMemo<Row[]>(() => {
    const values = series.map((p) => p.anomaly);
    const smooth = movingAverage(values, SMOOTH_WINDOW);
    const { slope, intercept } = senLine(values);
    return series.map((p, t) => ({
      t,
      date: p.date,
      anomaly: p.anomaly,
      smooth: smooth[t] ?? null,
      trend: intercept + slope * t,
    }));
  }, [series]);

  const firstYear = Number(series[0]?.date.slice(0, 4));
  const ticks = rows.filter((r) => r.t % TICK_EVERY_MONTHS === 0).map((r) => r.t);

  return (
    <div className="anomaly-chart" role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: compact ? 4 : 0 }}>
          {!compact && <CartesianGrid stroke="var(--border)" vertical={false} />}
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, rows.length - 1]}
            ticks={ticks}
            tickFormatter={(t: number) => String(firstYear + Math.floor(t / 12))}
            hide={compact}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" }}
          />
          <YAxis
            hide={compact}
            width={48}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => number(v, 2)}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" }}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <Tooltip
            cursor={{ stroke: "var(--primary)", strokeOpacity: 0.3 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Row | undefined;
              if (!active || !row) return null;
              return (
                <div className="chart-tooltip">
                  <div>{row.date.slice(0, 7)}</div>
                  <strong>
                    {signed(row.anomaly, decimals + 1)} {unit}
                  </strong>
                  {row.smooth !== null && <div>12 meses: {signed(row.smooth, decimals + 1)}</div>}
                </div>
              );
            }}
          />
          <Line
            dataKey="anomaly"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.45}
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="smooth"
            stroke="var(--primary)"
            strokeWidth={compact ? 1.5 : 2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="trend"
            stroke="var(--trend-down)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
