// Brand name with mark and tagline, as shown at the top of the sidebar.
import { app_name, app_tagline } from '@/lib/app_config';
import { BrandMark } from '@/components/layout/brand_mark';

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      {!compact && (
        <div className="min-w-0">
          <div className="font-serif text-[22px] leading-none tracking-[-0.02em]">{app_name}</div>
          <div className="mt-1.5 text-[9.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{app_tagline}</div>
        </div>
      )}
    </div>
  );
}
