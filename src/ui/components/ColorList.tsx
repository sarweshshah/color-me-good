import { useRef } from 'preact/hooks';
import { gsap } from 'gsap';
import { SerializedColorEntry, PropertyType } from '../../shared/types';
import type { ColorDisplayFormat } from '../../shared/messages';
import { ColorRow } from './ColorRow';
import { useGsapContext } from '../hooks/useGsapContext';
import { DURATION, EASE, tweenVars } from '../utils/motion';

interface ColorListProps {
  /** Changes when the underlying scan results change (not filters/sort). */
  entranceKey: string;
  colors: SerializedColorEntry[];
  selectedIds: Set<string>;
  propertyFilters: Set<PropertyType>;
  nodeTypeFilters: Set<string>;
  hiddenOnlyFilter: boolean;
  colorDisplayFormat: ColorDisplayFormat;
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onElementClick: (nodeId: string, event: MouseEvent) => void;
  onCopySuccess?: () => void;
}

export function ColorList({
  entranceKey,
  colors,
  selectedIds,
  propertyFilters,
  nodeTypeFilters,
  hiddenOnlyFilter,
  colorDisplayFormat,
  onSelectAll,
  onRowClick,
  onElementClick,
  onCopySuccess,
}: ColorListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useGsapContext(
    () => {
      if (!entranceKey || colors.length === 0) return;

      gsap.from('.color-row', tweenVars({
        autoAlpha: 0,
        y: 6,
        duration: DURATION.normal,
        stagger: { amount: 0.35, from: 'start' },
        ease: EASE.out,
        overwrite: 'auto',
      }));
    },
    [entranceKey],
    listRef
  );

  if (colors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-figma-text-secondary text-sm">
          No colors match your filters
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex-1 min-h-0 overflow-auto overscroll-contain">
      {colors.map((color) => (
        <ColorRow
          key={color.dedupKey}
          color={color}
          isSelected={selectedIds.has(color.dedupKey)}
          propertyFilters={propertyFilters}
          nodeTypeFilters={nodeTypeFilters}
          hiddenOnlyFilter={hiddenOnlyFilter}
          colorDisplayFormat={colorDisplayFormat}
          onSelectAll={onSelectAll}
          onRowClick={onRowClick}
          onElementClick={onElementClick}
          onCopySuccess={onCopySuccess}
        />
      ))}
    </div>
  );
}
