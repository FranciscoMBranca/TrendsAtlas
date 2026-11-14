import type { Polygon } from 'geojson';

// D3's spherical polygons use clockwise exterior rings for small areas.
export function bboxPolygon([west, south, east, north]: [number, number, number, number]): Polygon {
  return { type: 'Polygon', coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]] };
}

export function cellKey(lon: number, lat: number): string | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
  const x = Math.min(177.5, Math.floor((lon + 180) / 5) * 5 - 177.5);
  const y = Math.min(87.5, Math.floor((lat + 90) / 5) * 5 - 87.5);
  return `${x},${y}`;
}