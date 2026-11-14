import { describe, expect, it } from 'vitest';
import { geoArea } from 'd3-geo';
import { geoRobinson } from 'd3-geo-projection';
import { bboxPolygon, cellKey } from './map-geometry';

describe('Grelha Robinson', () => {
  it('representa uma célula de 5 graus, não o seu complemento', () => {
    const area = geoArea(bboxPolygon([0, 0, 5, 5]));
    expect(area).toBeGreaterThan(0);
    expect(area).toBeLessThan(0.01);
  });
  it('identifica centros da grelha e os limites do planeta', () => {
    expect(cellKey(132, 2)).toBe('132.5,2.5');
    expect(cellKey(-180, -90)).toBe('-177.5,-87.5');
    expect(cellKey(180, 90)).toBe('177.5,87.5');
    expect(cellKey(181, 0)).toBeNull();
  });
  it('conserva coordenadas na projecção e inversão Robinson', () => {
    const projection = geoRobinson();
    const points: [number, number][] = [[132.5, 2.5], [-177.5, 87.5], [-20, 50]];
    for (const point of points) {
      const projected = projection(point);
      expect(projected).not.toBeNull();
      if (!projected) throw new Error('Projecção ausente');
      const inverted = projection.invert?.(projected);
      expect(inverted?.[0]).toBeCloseTo(point[0], 4);
      expect(inverted?.[1]).toBeCloseTo(point[1], 4);
    }
  });
});