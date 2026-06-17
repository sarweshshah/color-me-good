import { SerializedColorEntry } from '../../shared/types';
import { formatHex, gradientToCSSString } from '../utils/format';

interface SwatchProps {
  color: SerializedColorEntry;
  size?: number;
}

const CHECKERBOARD = `
  linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
  linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)
`;

function swatchSizeStyle(size: number): Record<string, string> {
  return {
    width: `${size}px`,
    height: `${size}px`,
  };
}

export function Swatch({ color, size = 24 }: SwatchProps) {
  if (color.type === 'solid' && color.hex) {
    const fill = formatHex(color.hex);
    return (
      <div
        className="color-swatch color-swatch--checkerboard shrink-0"
        style={{
          ...swatchSizeStyle(size),
          backgroundImage: `
            linear-gradient(${fill}, ${fill}),
            ${CHECKERBOARD}
          `,
        }}
      />
    );
  }

  if (color.type === 'gradient' && color.gradient) {
    return (
      <div
        className="color-swatch shrink-0"
        style={{
          ...swatchSizeStyle(size),
          background: gradientToCSSString(color.gradient),
        }}
      />
    );
  }

  return (
    <div
      className="color-swatch shrink-0 bg-figma-border"
      style={swatchSizeStyle(size)}
    />
  );
}
