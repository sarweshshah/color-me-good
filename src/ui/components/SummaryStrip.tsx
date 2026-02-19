import { SerializedColorEntry } from '../../shared/types';

interface SummaryStripProps {
  colors: SerializedColorEntry[];
  totalNodesScanned: number;
}

export function SummaryStrip({ colors }: SummaryStripProps) {
  const tokenBound = colors.filter((c) => c.isTokenBound).length;
  const hardCoded = colors.filter((c) => !c.isTokenBound).length;
  const totalElements = colors.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <div className="bg-figma-bg px-4 py-3 border-b border-figma-border">
      <div className="flex items-center gap-4 text-xs">
        <Stat label="Colors" value={colors.length} />
        <Stat label="Token-bound" value={tokenBound} color="text-figma-green" />
        <Stat label="Hard-coded" value={hardCoded} color="text-figma-orange" />
        <Stat label="Elements" value={totalElements} />
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
  color?: string;
}

function Stat({ label, value, color = 'text-figma-text' }: StatProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-figma-text-secondary">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
