import { ComponentChildren } from 'preact';

interface SettingsSectionProps {
  title: string;
  children: ComponentChildren;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="border-b border-figma-border last:border-b-0">
      <h2 className="font-mono text-[10px] font-medium text-figma-text-secondary uppercase tracking-wider px-4 pt-4 pb-1">
        {title}
      </h2>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}
