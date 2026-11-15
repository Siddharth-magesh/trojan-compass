// "Student context on" chip with a popover listing what the assistant knows from the profile.
import { ChevronDown, Fingerprint } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { student_profile } from '@/lib/api_types';
import { use_auth } from '@/lib/auth_provider';
import { format_usd } from '@/lib/format';

function profile_rows(p: student_profile): [string, string][] {
  const rows: [string, string | undefined][] = [
    ['Name', p.display_name],
    ['Program', p.program],
    ['Level', p.level],
    ['International student', p.international === undefined ? undefined : p.international ? 'Yes' : 'No'],
    ['Interests', p.interests?.join(', ')],
    ['Housing budget', p.housing_budget_usd !== undefined ? format_usd(p.housing_budget_usd) + ' / month' : undefined],
    ['Job interests', p.job_interests?.join(', ')],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

export function ContextPopover() {
  const { student, set_login_open } = use_auth();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="button-context"
          className="inline-flex items-center gap-1.5 rounded-md bg-sage-soft px-2 py-1 text-[11px] font-medium text-sage transition-colors hover:bg-sage-soft/70"
        >
          <Fingerprint className="h-3 w-3" />
          {student ? 'Student context on' : 'No student context'}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[300px] rounded-xl border bg-popover p-4 shadow-soft">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-faint">What I know about you</p>
        {student ? (
          <dl className="mt-3 grid gap-2">
            {profile_rows(student).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2 text-[12px]">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-3 text-[12.5px] text-muted-foreground">
            Nothing yet.{' '}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => set_login_open(true)}>
              Choose a demo student
            </button>{' '}
            to personalize answers.
          </div>
        )}
        <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Your identity comes from your session, never from what you type. This profile is only used to tailor answers.
        </p>
      </PopoverContent>
    </Popover>
  );
}
