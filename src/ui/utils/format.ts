import { GradientData } from '../../shared/types';

export function formatHex(hex: string): string {
  if (hex.length === 9 && hex.endsWith('FF')) {
    return hex.substring(0, 7);
  }
  return hex;
}

export function gradientToCSSString(gradient: GradientData): string {
  const stops = gradient.stops
    .map((stop) => {
      const r = Math.round(stop.color.r * 255);
      const g = Math.round(stop.color.g * 255);
      const b = Math.round(stop.color.b * 255);
      const a = stop.color.a;
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
