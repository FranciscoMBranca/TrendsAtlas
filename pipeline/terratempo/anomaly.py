"""Formulas 1, 2 and F3: monthly anomalies and area-weighted means."""

from __future__ import annotations

import numpy as np


def monthly_anomaly(values: np.ndarray, months: np.ndarray) -> np.ndarray:
    """Formula 1: a(t) = x(t) - mean of all values of the same calendar month.

    ``values`` has time on axis 0 (any trailing shape). ``months`` holds 1..12.
    Missing values are NaN and stay NaN.
    """
    values = np.asarray(values, dtype=float)
    months = np.asarray(months)
    if values.shape[0] != months.shape[0]:
        raise ValueError("values and months must have the same length on axis 0")
    out = np.full_like(values, np.nan)
    for m in range(1, 13):
        sel = months == m
        if not sel.any():
            continue
        block = values[sel]
        with np.errstate(invalid="ignore"):
            clim = np.nanmean(block, axis=0) if np.isfinite(block).any() else np.nan
        out[sel] = block - clim
    return out


def cos_lat_weights(lats: np.ndarray) -> np.ndarray:
    """Formula 2 weights: w_i = cos(phi_i), phi in degrees."""
    return np.cos(np.deg2rad(np.asarray(lats, dtype=float)))


def weighted_mean(field: np.ndarray, lats: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    """Formula 2 / F3: area-weighted mean over (lat, lon) for every time step.

    ``field`` has shape (time, nlat, nlon). ``mask`` (nlat, nlon) selects the
    cells of a region; None means the whole globe. NaN cells are ignored.
    """
    field = np.asarray(field, dtype=float)
    w = np.broadcast_to(cos_lat_weights(lats)[:, None], field.shape[1:]).astype(float)
    if mask is not None:
        w = np.where(mask, w, 0.0)
    valid = np.isfinite(field)
    wt = np.where(valid, w[None, :, :], 0.0)
    total = wt.sum(axis=(1, 2))
    num = np.where(valid, field, 0.0) * wt
    with np.errstate(invalid="ignore", divide="ignore"):
        out = num.sum(axis=(1, 2)) / total
    out[total == 0] = np.nan
    return out
