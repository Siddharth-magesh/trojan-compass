// Route table: one flat switch inside the persistent shell.
import { Route, Switch } from 'wouter';
import { ChatPage } from '@/app/chat_page';
import { ChecklistsPage } from '@/app/checklists_page';
import { ConversationsPage } from '@/app/conversations_page';
import { NotFoundPage } from '@/app/not_found_page';
import { ShortcutsPage } from '@/app/shortcuts_page';

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/">{() => <ChatPage />}</Route>
      <Route path="/c/:session_id">{(params) => <ChatPage session_id={params.session_id} />}</Route>
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/checklists" component={ChecklistsPage} />
      <Route path="/shortcuts" component={ShortcutsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
