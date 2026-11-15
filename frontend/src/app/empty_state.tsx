// Composed empty state used across workspace pages.
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center rounded-2xl border border-dashed bg-surface/60 px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-sage-soft text-sage"><Icon className="h-5 w-5" /></span>
      <h2 className="mt-4 font-serif text-[22px]">{title}</h2>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
