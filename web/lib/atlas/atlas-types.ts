export interface GridCell {
  lat: number;
  lon: number;
  trend: number;
  p: number;
  ci: [number, number];
}
export interface MonthlyPoint {
  date: string;
  anomaly: number;
}
export interface Region {
  id: string;
  name: string;
  bbox: [number, number, number, number];
  trend: number;
  p: number;
  ci: [number, number];
  series: MonthlyPoint[];
}
export const number = (value: number, digits = 2) =>
  value.toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const signed = (value: number, digits = 2) =>
  `${value >= 0 ? "+" : "−"}${number(Math.abs(value), digits)}`;
