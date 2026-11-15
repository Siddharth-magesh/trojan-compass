// All conversations for the current demo student, with search and removal from this device.
import { useState } from 'react';
import { Link } from 'wouter';
import { ListChecks, MessagesSquare, Search, Trash2 } from 'lucide-react';
import { use_auth } from '@/lib/auth_provider';
import { relative_day } from '@/lib/format';
import { remove_conversation, use_conversations } from '@/lib/local_store';
import { PageHeader } from '@/app/page_header';
import { EmptyState } from '@/app/empty_state';

export function ConversationsPage() {
  const { student, set_login_open } = use_auth();
  const list = use_conversations(student?.student_id ?? null);
  const [query, set_query] = useState('');
  const shown = list.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-16 sm:px-6 md:px-10">
      <PageHeader eyebrow="Your workspace" title="Conversations" body="Everything you've asked, kept in this browser for the current demo student." />
      {!student ? (
        <EmptyState icon={MessagesSquare} title="No student chosen yet" body="Conversations are kept per demo student.">
          <button type="button" onClick={() => set_login_open(true)} className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground">Choose a demo student</button>
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="A quiet start" body="Your first question will appear here.">
          <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground">Ask something</Link>
        </EmptyState>
      ) : (
        <>
          <label className="mb-4 flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2.5 focus-within:border-input">
            <Search className="h-4 w-4 text-faint" />
            <span className="sr-only">Search conversations</span>
            <input value={query} onChange={(e) => set_query(e.target.value)} placeholder="Search by title" data-testid="input-search-conversations" className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint focus-visible:outline-none" />
          </label>
          <ul className="divide-y rounded-xl border bg-card">
            {shown.map((c) => (
              <li key={c.session_id} className="group flex items-center gap-3 px-4 py-3">
                <Link href={'/c/' + c.session_id} className="min-w-0 flex-1" data-testid={'link-conversation-' + c.session_id}>
                  <span className="block truncate text-[13.5px] group-hover:text-primary">{c.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                    {relative_day(c.updated_at)}
                    {c.has_checklist && <span className="inline-flex items-center gap-1 text-sage"><ListChecks className="h-3 w-3" /> Checklist</span>}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => remove_conversation(student.student_id, c.session_id)}
                  aria-label={'Remove ' + c.title + ' from this device'}
                  data-testid={'button-remove-' + c.session_id}
                  className="grid h-8 w-8 place-items-center rounded-md text-faint opacity-100 transition-opacity hover:bg-accent hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">Nothing matches "{query}".</li>}
          </ul>
        </>
      )}
    </div>
  );
}
