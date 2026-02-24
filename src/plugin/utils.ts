import { RGBA, GradientData } from '../shared/types';

function toHex(val: number): string {
  const hex = Math.round(val * 255)
    .toString(16)
    .toUpperCase();
  return hex.padStart(2, '0');
}

export function rgbaToHex(rgba: RGBA): string {
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${toHex(rgba.a)}`;
}

export function hashGradient(gradient: GradientData): string {
  const stopsStr = gradient.stops
    .map((s) => `${rgbaToHex(s.color)}@${s.position}`)
    .join('|');
  const angleStr = gradient.angle !== undefined ? `angle:${gradient.angle}` : '';
  const transformStr = gradient.transform
    ? `transform:${gradient.transform.flat().join(',')}`
    : '';
  return `${gradient.gradientType}:${stopsStr}:${angleStr}:${transformStr}`;
}

export function buildLayerPath(node: SceneNode): string {
  const parts: string[] = [];
  let current: BaseNode | null = node;

  while (current && current.type !== 'PAGE') {
    if ('name' in current) {
      parts.unshift(current.name);
    }
    current = current.parent;
  }

  return parts.join(' > ');
}
