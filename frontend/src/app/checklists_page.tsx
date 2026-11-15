// Conversations that contain a checklist, so progress is one click away.
import { Link } from 'wouter';
import { ArrowUpRight, ListChecks } from 'lucide-react';
import { use_auth } from '@/lib/auth_provider';
import { use_chat } from '@/lib/chat_provider';
import { relative_day } from '@/lib/format';
import { use_conversations } from '@/lib/local_store';
import { PageHeader } from '@/app/page_header';
import { EmptyState } from '@/app/empty_state';

export function ChecklistsPage() {
  const { student, set_login_open } = use_auth();
  const { send } = use_chat();
  const list = use_conversations(student?.student_id ?? null).filter((c) => c.has_checklist);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-16 sm:px-6 md:px-10">
      <PageHeader eyebrow="Your workspace" title="Checklists" body="Checklists live inside the conversation that created them. Ticks are saved on this device." />
      {list.length === 0 ? (
        <EmptyState icon={ListChecks} title="No checklists yet" body="Ask for a pre-semester checklist and it will be saved here.">
          <button
            type="button"
            onClick={() => (student ? send('Give me a pre-semester checklist') : set_login_open(true))}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground"
            data-testid="button-create-checklist"
          >
            {student ? 'Create a pre-semester checklist' : 'Choose a demo student'}
          </button>
        </EmptyState>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.session_id}>
              <Link href={'/c/' + c.session_id} className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-input hover:shadow-soft" data-testid={'link-checklist-' + c.session_id}>
                <span className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-sage-soft text-sage"><ListChecks className="h-4 w-4" /></span>
                  <ArrowUpRight className="h-4 w-4 text-faint group-hover:text-primary" />
                </span>
                <span className="mt-3 line-clamp-2 text-[13.5px] font-medium">{c.title}</span>
                <span className="mt-1 text-[11.5px] text-muted-foreground">Updated {relative_day(c.updated_at).toLowerCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
