// Sidebar footer identity: demo student chip with switch/sign-out, or a choose-demo-student button.
import { LogOut, UserRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { use_auth } from '@/lib/auth_provider';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ProfileChip({ collapsed }: { collapsed: boolean }) {
  const { student, checking, set_login_open, sign_out } = use_auth();
  const [, navigate] = useLocation();
  if (checking) return <div className="h-10 animate-pulse rounded-lg bg-muted" />;
  if (!student) {
    return (
      <button
        type="button"
        onClick={() => set_login_open(true)}
        data-testid="button-choose-demo-student"
        className={cn('flex w-full items-center gap-2.5 rounded-lg border border-dashed border-primary/35 px-3 py-2.5 text-left text-[12.5px] font-medium text-primary transition-colors hover:bg-cardinal-soft', collapsed && 'justify-center px-0')}
      >
        <UserRound className="h-4 w-4 shrink-0" />
        {!collapsed && 'Choose a demo student'}
      </button>
    );
  }
  return (
    <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col')}>
      <button
        type="button"
        onClick={() => set_login_open(true)}
        title="Switch demo student"
        data-testid="button-switch-student"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-sidebar-accent/60"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-soft font-serif text-[13px] text-amber-ink">{initials(student.display_name)}</span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium" data-testid="text-student-name">{student.display_name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{student.program ?? 'Demo student'}</span>
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label="Sign out of demo student"
        title="Sign out"
        data-testid="button-sign-out"
        onClick={() => {
          sign_out();
          navigate('/');
        }}
        className="grid h-8 w-8 place-items-center rounded-md text-faint transition-colors hover:bg-sidebar-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
