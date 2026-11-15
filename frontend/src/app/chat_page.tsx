// Chat route for "/" (home state) and "/c/:session_id" (restored conversation).
import { useEffect, type ReactNode } from 'react';
import { MessagesSquare, RotateCcw } from 'lucide-react';
import { use_auth } from '@/lib/auth_provider';
import { use_chat } from '@/lib/chat_provider';
import { Composer } from '@/components/chat/composer';
import { HomeView } from '@/components/chat/home_view';
import { MessageList } from '@/components/chat/message_list';

function HistorySkeleton() {
  return (
    <div className="grid gap-8 pt-10" aria-label="Loading conversation" role="status">
      <div className="ml-auto h-11 w-2/3 animate-pulse rounded-[14px] bg-muted" />
      <div className="grid gap-2.5">
        <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
        {['w-full', 'w-[90%]', 'w-[70%]'].map((w) => <div key={w} className={'h-3 animate-pulse rounded-full bg-muted ' + w} />)}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="h-36 animate-pulse rounded-xl bg-muted" />
          <div className="h-36 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function CenterNote({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="mx-auto my-auto grid max-w-sm justify-items-center py-20 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-sage-soft text-sage"><MessagesSquare className="h-5 w-5" /></span>
      <h2 className="mt-4 font-serif text-[24px]">{title}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-5 flex gap-2">{children}</div>
    </div>
  );
}

export function ChatPage({ session_id }: { session_id?: string }) {
  const { messages, open_session, loading_session, load_error, new_chat } = use_chat();
  const { student, checking, set_login_open } = use_auth();

  useEffect(() => {
    if (session_id && student) open_session(session_id);
  }, [session_id, student, open_session]);

  const needs_identity = Boolean(session_id) && !student && !checking;
  const is_home = !needs_identity && !load_error && !(loading_session || (session_id && checking)) && messages.length === 0 && !session_id;
  let body: ReactNode;
  if (needs_identity) {
    body = (
      <CenterNote title="Whose conversation is this?" body="Conversations belong to a demo student. Choose one to reopen it.">
        <button type="button" onClick={() => set_login_open(true)} className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground">Choose a demo student</button>
      </CenterNote>
    );
  } else if (load_error) {
    body = (
      <CenterNote title="This conversation didn't load" body={load_error + ' It may belong to another demo student or have been cleared.'}>
        <button type="button" onClick={() => session_id && open_session(session_id)} className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] hover:bg-accent" data-testid="button-retry-load">
          <RotateCcw className="h-3.5 w-3.5" /> Try again
        </button>
        <button type="button" onClick={new_chat} className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground">New conversation</button>
      </CenterNote>
    );
  } else if (loading_session || (session_id && checking)) {
    body = <HistorySkeleton />;
  } else if (messages.length === 0 && !session_id) {
    body = <HomeView composer={<Composer inline />} />;
  } else {
    body = <MessageList messages={messages} />;
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-4 sm:px-6 md:px-10">
      <div className="flex-1">{body}</div>
      {!is_home && <Composer />}
    </div>
  );
}
