import { RGBA, SerializedColorEntry } from '../../shared/types';

/** Lab chroma below this is treated as achromatic (hue ignored). */
const ACHROMATIC_CHROMA = 2;
const UNSORTABLE_L = -1;

interface LchMetrics {
  L: number;
  C: number;
  H: number;
  alpha: number;
  dedupKey: string;
}

function hexToRgba(hex: string): RGBA {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function rgbaToXyz({ r, g, b }: RGBA): { x: number; y: number; z: number } {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return {
    x: R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    y: R * 0.2126729 + G * 0.7151522 + B * 0.072175,
    z: R * 0.0193339 + G * 0.119192 + B * 0.9503041,
  };
}

function labTransfer(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116;
}

function xyzToLab(x: number, y: number, z: number): { L: number; a: number; b: number } {
  const fx = labTransfer(x / 0.95047);
  const fy = labTransfer(y / 1.0);
  const fz = labTransfer(z / 1.08883);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labToLch(L: number, a: number, b: number): { L: number; C: number; H: number } {
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

function rgbaToLch(rgba: RGBA): { L: number; C: number; H: number } {
  const { x, y, z } = rgbaToXyz(rgba);
  const lab = xyzToLab(x, y, z);
  return labToLch(lab.L, lab.a, lab.b);
}

function metricsFromRgba(rgba: RGBA, dedupKey: string): LchMetrics {
  const { L, C, H } = rgbaToLch(rgba);
  return {
    L,
    C,
    H: C < ACHROMATIC_CHROMA ? 0 : H,
    alpha: rgba.a,
    dedupKey,
  };
}

function getColorSortMetrics(entry: SerializedColorEntry): LchMetrics {
  if (entry.type === 'gradient' && entry.gradient?.stops.length) {
    return metricsFromRgba(entry.gradient.stops[0].color, entry.dedupKey);
  }

  const rgba = entry.rgba ?? (entry.hex ? hexToRgba(entry.hex) : null);
  if (!rgba) {
    return { L: UNSORTABLE_L, C: 0, H: 0, alpha: 0, dedupKey: entry.dedupKey };
  }

  return metricsFromRgba(rgba, entry.dedupKey);
}

/**
 * Perceptual color sort: LCH lightness → chroma → hue → alpha → dedupKey.
 * Ascending = light → dark, saturated → muted, red → violet around the wheel.
 */
export function compareColorSort(
  a: SerializedColorEntry,
  b: SerializedColorEntry,
  direction: 1 | -1
): number {
  const ma = getColorSortMetrics(a);
  const mb = getColorSortMetrics(b);

  const lightnessDiff = mb.L - ma.L;
  if (lightnessDiff !== 0) return lightnessDiff * direction;

  const chromaDiff = mb.C - ma.C;
  if (chromaDiff !== 0) return chromaDiff * direction;

  const hueDiff = ma.H - mb.H;
  if (hueDiff !== 0) return hueDiff * direction;

  const alphaDiff = mb.alpha - ma.alpha;
  if (alphaDiff !== 0) return alphaDiff * direction;

  return ma.dedupKey.localeCompare(mb.dedupKey) * direction;
}
