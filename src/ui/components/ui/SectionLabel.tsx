interface SectionLabelProps {
  label: string;
}

export function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="px-2.5 pt-1.5 pb-0.5 first:pt-0.5">
      <span className="font-mono text-[10px] font-medium text-figma-text-secondary uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
