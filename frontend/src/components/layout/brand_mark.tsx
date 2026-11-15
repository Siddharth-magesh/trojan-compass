// The Trojan Compass mark: a cardinal rounded tile with a minimal compass needle.
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 38" className={cn('h-9 w-[34px] shrink-0', className)} aria-hidden="true">
      <path d="M6 1h24a5 5 0 0 1 5 5v18c0 7.5-7.6 13-17 13S1 31.5 1 24V6a5 5 0 0 1 5-5Z" fill="hsl(351 57% 35%)" />
      <circle cx="18" cy="18" r="9.5" fill="none" stroke="hsl(40 60% 94%)" strokeWidth="1.3" opacity="0.85" />
      <path d="M18 10.5 20.6 18 18 25.5 15.4 18Z" fill="hsl(40 60% 96%)" />
      <path d="M18 10.5 20.6 18h-5.2Z" fill="hsl(40 55% 70%)" />
      <circle cx="18" cy="18" r="1.3" fill="hsl(351 57% 35%)" />
    </svg>
  );
}
