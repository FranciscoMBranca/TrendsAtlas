// Fixed colour scale per variable, so two periods can be compared by eye (SPEC-130).
export const SCALE_MAX: Record<string, number> = {
  temperatura: 0.8,
  precipitacao: 0.15,
  humidade: 0.2,
  aerossois: 0.03,
};

// Blue-white-red diverging scale.
export function colour(v: number, max: number): string {
  const x = Math.max(-1, Math.min(1, v / max));
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const [r, g, b] =
    x >= 0
      ? [lerp(247, 178, x), lerp(247, 24, x), lerp(247, 43, x)]
      : [lerp(247, 33, -x), lerp(247, 102, -x), lerp(247, 172, -x)];
  return `rgb(${r},${g},${b})`;
}
