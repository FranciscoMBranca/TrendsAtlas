"use client";

import type { Analysis } from "@/lib/api";

const W = 720;
const H = 260;
const PAD = { l: 48, r: 12, t: 12, b: 28 };

export default function Chart({ a, title }: { a: Analysis; title: string }) {
  const ys = a.serie.map((p) => p.anomalia);
  const all = [...ys, ...a.banda_inferior, ...a.banda_superior].filter((v): v is number => v !== null);
  if (all.length === 0) return null;
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const n = ys.length;
  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = (vals: (number | null)[]) =>
    vals
      .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const band =
    a.banda_superior.map((v, i) => (v === null ? "" : `${x(i)},${y(v)}`)).filter(Boolean).join(" ") +
    " " +
    a.banda_inferior
      .map((v, i) => (v === null ? "" : `${x(i)},${y(v)}`))
      .filter(Boolean)
      .reverse()
      .join(" ");
  const first = a.serie[0]?.t ?? "";
  const last = a.serie[n - 1]?.t ?? "";
  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <polygon points={band} className="band" />
        {lo < 0 && hi > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="zero" />}
        <polyline points={path(ys)} className="series" />
        <polyline points={path(a.tendencia_linha)} className="trend" />
        {ticks.map((tv) => (
          <text key={tv} x={PAD.l - 6} y={y(tv) + 4} textAnchor="end" className="tick">
            {tv.toFixed(Math.abs(hi - lo) < 0.5 ? 3 : 2)}
          </text>
        ))}
        <text x={PAD.l} y={H - 8} className="tick">{first}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className="tick">{last}</text>
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}
