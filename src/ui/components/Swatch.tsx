import { SerializedColorEntry } from '../../shared/types';
import { formatHex, gradientToCSSString } from '../utils/format';

interface SwatchProps {
  color: SerializedColorEntry;
  size?: number;
}

export function Swatch({ color, size = 24 }: SwatchProps) {
  if (color.type === 'solid' && color.hex) {
    return (
      <div
        className="rounded border border-figma-border shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `
            linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
            linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 4px 4px',
        }}
      >
        <div
          className="w-full h-full rounded"
          style={{ backgroundColor: formatHex(color.hex) }}
        />
      </div>
    );
  }

  if (color.type === 'gradient' && color.gradient) {
    return (
      <div
        className="rounded border border-figma-border shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: gradientToCSSString(color.gradient),
        }}
      />
    );
  }

  return (
    <div
      className="rounded border border-figma-border shrink-0 bg-figma-border"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
