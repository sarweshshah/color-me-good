interface SectionLabelProps {
  label: string;
}

export function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-[10px] font-medium text-figma-text-secondary uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
