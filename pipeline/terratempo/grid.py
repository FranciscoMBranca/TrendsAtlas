"""Regular lat/lon grids and region masks (F3)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Grid:
    resolution: float
    lats: np.ndarray  # cell centres, south to north
    lons: np.ndarray  # cell centres, west to east

    @classmethod
    def regular(cls, resolution: float) -> "Grid":
        nlat = int(round(180 / resolution))
        nlon = int(round(360 / resolution))
        lats = -90 + resolution * (np.arange(nlat) + 0.5)
        lons = -180 + resolution * (np.arange(nlon) + 0.5)
        return cls(resolution, lats, lons)

    @property
    def shape(self) -> tuple[int, int]:
        return self.lats.size, self.lons.size

    def cell_index(self, lon: float, lat: float) -> tuple[int, int]:
        i = int(np.clip(np.floor((lat + 90) / self.resolution), 0, self.lats.size - 1))
        j = int(np.clip(np.floor((((lon + 180) % 360)) / self.resolution), 0, self.lons.size - 1))
        return i, j


def _points_in_polygon(px: np.ndarray, py: np.ndarray, ring: np.ndarray) -> np.ndarray:
    """Even-odd ray casting for many points against one ring of (lon, lat)."""
    inside = np.zeros(px.shape, dtype=bool)
    x, y = ring[:, 0], ring[:, 1]
    n = len(ring)
    for k in range(n):
        x1, y1 = x[k], y[k]
        x2, y2 = x[(k + 1) % n], y[(k + 1) % n]
        crosses = (y1 > py) != (y2 > py)
        with np.errstate(divide="ignore", invalid="ignore"):
            xint = (x2 - x1) * (py - y1) / (y2 - y1) + x1
        inside ^= crosses & (px < xint)
    return inside


def polygon_mask(grid: Grid, rings: list[list[list[float]]]) -> tuple[np.ndarray, bool]:
    """Mask of cells whose centre is inside a GeoJSON polygon (outer ring minus holes).

    Returns (mask, smaller_than_cell). If no centre falls inside, the cell that
    contains the polygon's mean vertex is used and the flag is True.
    """
    lon2d, lat2d = np.meshgrid(grid.lons, grid.lats)
    outer = np.asarray(rings[0], dtype=float)
    mask = _points_in_polygon(lon2d, lat2d, outer)
    for hole in rings[1:]:
        mask &= ~_points_in_polygon(lon2d, lat2d, np.asarray(hole, dtype=float))
    if mask.any():
        return mask, False
    cx, cy = outer[:, 0].mean(), outer[:, 1].mean()
    mask = np.zeros(grid.shape, dtype=bool)
    mask[grid.cell_index(cx, cy)] = True
    return mask, True


def bbox_to_ring(west: float, south: float, east: float, north: float) -> list[list[float]]:
    return [[west, south], [east, south], [east, north], [west, north], [west, south]]
