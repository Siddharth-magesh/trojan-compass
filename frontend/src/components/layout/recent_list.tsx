// Recent conversations from the local session index, linking to /c/:session_id.
import { Link, useLocation } from 'wouter';
import type { conversation_entry } from '@/lib/local_store';
import { cn } from '@/lib/utils';

export function RecentList({ items, on_navigate }: { items: conversation_entry[]; on_navigate?: () => void }) {
  const [location] = useLocation();
  if (items.length === 0) {
    return <p className="px-3 text-[12px] leading-relaxed text-faint">Your conversations will gather here.</p>;
  }
  return (
    <ul className="grid gap-px">
      {items.slice(0, 8).map((c) => {
        const active = location === '/c/' + c.session_id;
        return (
          <li key={c.session_id}>
            <Link
              href={'/c/' + c.session_id}
              onClick={on_navigate}
              aria-current={active ? 'page' : undefined}
              data-testid={'link-recent-' + c.session_id}
              className={cn(
                'block truncate rounded-md px-3 py-2 text-[12.5px] text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent/50 hover:text-foreground',
                active && 'bg-sidebar-accent/70 text-foreground',
              )}
            >
              {c.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
