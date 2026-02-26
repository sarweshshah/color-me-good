import { GradientData, RGBA, SerializedColorEntry } from '../../shared/types';
import type { ColorDisplayFormat } from '../../shared/messages';

export function formatHex(hex: string): string {
  if (hex.length === 9 && hex.endsWith('FF')) {
    return hex.substring(0, 7);
  }
  return hex;
}

function formatAlpha(a: number): string {
  if (a >= 1) return '1';
  return a.toFixed(2);
}

function formatRgba(rgba: RGBA): string {
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);
  const a = formatAlpha(rgba.a);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function rgbaToHsla(rgba: RGBA): { h: number; s: number; l: number; a: number } {
  const r = rgba.r;
  const g = rgba.g;
  const b = rgba.b;
  const a = rgba.a;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100, a };
}

function formatHsla(rgba: RGBA): string {
  const { h, s, l, a } = rgbaToHsla(rgba);
  const hRound = Math.round(h);
  const sRound = Math.round(s);
  const lRound = Math.round(l);
  if (a >= 1) {
    return `hsl(${hRound}, ${sRound}%, ${lRound}%)`;
  }
  return `hsla(${hRound}, ${sRound}%, ${lRound}%, ${formatAlpha(a)})`;
}

function rgbaToHsba(rgba: RGBA): { h: number; s: number; b: number; a: number } {
  const r = rgba.r;
  const g = rgba.g;
  const b = rgba.b;
  const a = rgba.a;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, b: v * 100, a };
}

function formatHsba(rgba: RGBA): string {
  const { h, s, b, a } = rgbaToHsba(rgba);
  const hRound = Math.round(h);
  const sRound = Math.round(s);
  const bRound = Math.round(b);
  if (a >= 1) {
    return `hsb(${hRound}, ${sRound}%, ${bRound}%)`;
  }
  return `hsba(${hRound}, ${sRound}%, ${bRound}%, ${formatAlpha(a)})`;
}

function hexToRgba(hex: string): RGBA {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function formatResolvedColor(
  color: SerializedColorEntry,
  format: ColorDisplayFormat
): string {
  if (color.type === 'gradient') {
    return 'Gradient';
  }
  const rgba = color.rgba ?? (color.hex ? hexToRgba(color.hex) : null);
  if (!rgba) return 'Gradient';
  switch (format) {
    case 'hex':
      return color.hex ? formatHex(color.hex) : formatRgba(rgba);
    case 'rgba':
      return formatRgba(rgba);
    case 'hsla':
      return formatHsla(rgba);
    case 'hsba':
      return formatHsba(rgba);
    default:
      return color.hex ? formatHex(color.hex) : formatRgba(rgba);
  }
}

export function gradientToCSSString(gradient: GradientData): string {
  const stops = gradient.stops
    .map((stop) => {
      const r = Math.round(stop.color.r * 255);
      const g = Math.round(stop.color.g * 255);
      const b = Math.round(stop.color.b * 255);
      const a = formatAlpha(stop.color.a);
      const pos = Math.round(stop.position * 100);
      return `rgba(${r}, ${g}, ${b}, ${a}) ${pos}%`;
    })
    .join(', ');

  switch (gradient.gradientType) {
    case 'LINEAR':
      const angle = gradient.angle ?? 0;
      return `linear-gradient(${angle}deg, ${stops})`;
    case 'RADIAL':
      return `radial-gradient(circle, ${stops})`;
    case 'ANGULAR':
      return `conic-gradient(${stops})`;
    case 'DIAMOND':
      return `radial-gradient(${stops})`;
    default:
      return `linear-gradient(${stops})`;
  }
}
