// "Choose a demo student" dialog. Demo identities only; nothing is authenticated silently.
import { useState } from 'react';
import { ArrowRight, Globe2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { use_auth } from '@/lib/auth_provider';
import { demo_students } from '@/lib/demo_students';
import { initials } from '@/lib/format';

export function DemoLoginDialog() {
  const { login_open, set_login_open, sign_in, student } = use_auth();
  const [pending, set_pending] = useState<string | null>(null);
  const [error, set_error] = useState<string | null>(null);

  const choose = async (id: string) => {
    set_pending(id);
    set_error(null);
    try {
      await sign_in(id);
    } catch {
      set_error('That demo student could not be loaded. Please try again.');
    } finally {
      set_pending(null);
    }
  };

  return (
    <Dialog open={login_open} onOpenChange={set_login_open}>
      <DialogContent className="max-w-[460px] rounded-[18px] border bg-background p-7 sm:p-8">
        <p className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-px w-5 bg-sage/50" /> Demo access
        </p>
        <DialogTitle className="font-serif text-[28px] font-normal leading-tight tracking-tight">Choose a demo student</DialogTitle>
        <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
          These are sample profiles for exploring the experience. There is no real sign-in and no USC account is connected.
        </DialogDescription>
        <ul className="mt-2 grid gap-2.5">
          {demo_students.map((s) => (
            <li key={s.student_id}>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void choose(s.student_id)}
                data-testid={'button-demo-' + s.student_id}
                className="group flex w-full items-center gap-3.5 rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-input hover:shadow-soft disabled:opacity-60"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-soft font-serif text-[16px] text-amber-ink">{initials(s.display_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14px] font-medium">
                    {s.display_name}
                    {student?.student_id === s.student_id && <span className="rounded bg-sage-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-sage">Current</span>}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">{[s.level, s.program].filter(Boolean).join(' \u00b7 ')}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-faint">
                    {s.international && <Globe2 className="h-3 w-3" />}
                    {s.blurb}
                  </span>
                </span>
                {pending === s.student_id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="text-[12px] text-destructive">{error}</p>}
        <p className="text-[11px] text-faint">Sample data only. Your choice lasts for this browser tab.</p>
      </DialogContent>
    </Dialog>
  );
}
