"use client";

import type { Analysis } from "@/lib/api";

const W = 720;
const H = 260;
const PAD = { l: 48, r: 12, t: 12, b: 28 };

/** "YYYY-MM" -> decimal year at mid-month; "YYYY" -> mid-year. */
export function decimalYear(label: string): number {
  const [y, m] = label.split("-").map(Number);
  return m ? y! + (m - 0.5) / 12 : y! + 0.5;
}

export default function Chart({
  a,
  title,
  showBand = true,
  showProjection = false,
  projectionLabel = "",
}: {
  a: Analysis;
  title: string;
  showBand?: boolean;
  showProjection?: boolean;
  projectionLabel?: string;
}) {
  const xs = a.serie.map((p) => decimalYear(p.t));
  const ys = a.serie.map((p) => p.anomalia);
  const lastX = xs[xs.length - 1] ?? 0;
  const future = showProjection && a.projeccao?.disponivel ? a.projeccao.pontos : [];
  const start = showProjection && a.projeccao?.disponivel ? a.projeccao.inicio : undefined;
  // Projection drawn from its starting point (fitted line at the last observed month).
  const proj = start ? [start, ...future] : future;
  const projX = proj.map((_, k) => lastX + k + (start ? 0 : 1));

  const values = [
    ...ys,
    ...a.tendencia_linha,
    ...(showBand ? [...a.banda_inferior, ...a.banda_superior] : []),
    ...proj.flatMap((p) => [p.inferior, p.superior, p.centro]),
  ].filter((v): v is number => v !== null && Number.isFinite(v));
  if (values.length === 0) return null;
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const x0 = xs[0] ?? 0;
  const x1 = projX.length ? projX[projX.length - 1]! : lastX;
  const x = (v: number) => PAD.l + ((v - x0) / Math.max(1e-9, x1 - x0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (px: number[], py: (number | null)[]) =>
    py
      .map((v, i) => (v === null ? null : `${x(px[i]!).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const area = (px: number[], top: (number | null)[], bottom: (number | null)[]) =>
    [
      ...top.map((v, i) => (v === null ? "" : `${x(px[i]!)},${y(v)}`)),
      ...bottom.map((v, i) => (v === null ? "" : `${x(px[i]!)},${y(v)}`)).reverse(),
    ]
      .filter(Boolean)
      .join(" ");

  const projLineX = projX;
  const projLineY = proj.map((p) => p.centro);
  const ticks = [lo, (lo + hi) / 2, hi];
  const yearTicks = [Math.floor(x0), Math.round((x0 + x1) / 2), Math.floor(x1)];

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {showBand && <polygon points={area(xs, a.banda_superior, a.banda_inferior)} className="band" />}
        {proj.length > 0 && (
          <>
            <polygon points={area(projX, proj.map((p) => p.superior), proj.map((p) => p.inferior))} className="proj-band" />
            <line x1={x(lastX)} x2={x(lastX)} y1={PAD.t} y2={H - PAD.b} className="proj-divider" />
            <polyline points={line(projLineX, projLineY)} className="proj-line" />
            <text x={x(lastX) + 6} y={PAD.t + 12} className="tick proj-label">
              {projectionLabel}
            </text>
          </>
        )}
        {lo < 0 && hi > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="zero" />}
        <polyline points={line(xs, ys)} className="series" />
        <polyline points={line(xs, a.tendencia_linha)} className="trend" />
        {ticks.map((tv) => (
          <text key={tv} x={PAD.l - 6} y={y(tv) + 4} textAnchor="end" className="tick">
            {tv.toFixed(Math.abs(hi - lo) < 0.5 ? 3 : 2)}
          </text>
        ))}
        {yearTicks.map((yt, i) => (
          <text key={`${yt}-${i}`} x={x(yt + 0.5)} y={H - 8} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} className="tick">
            {yt}
          </text>
        ))}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}
