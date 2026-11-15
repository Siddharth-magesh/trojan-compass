// Workspace navigation items for the sidebar (each is a real route).
import { BookMarked, Compass, ListChecks, MessagesSquare } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { app_name } from '@/lib/app_config';
import { cn } from '@/lib/utils';

type nav_item = { href: string; label: string; Icon: typeof Compass; count?: number; match: (p: string) => boolean };

export function NavLinks({ collapsed, conversation_count, checklist_count, on_navigate }: {
  collapsed: boolean;
  conversation_count: number;
  checklist_count: number;
  on_navigate?: () => void;
}) {
  const [location] = useLocation();
  const items: nav_item[] = [
    { href: '/', label: 'Ask ' + app_name, Icon: Compass, match: (p) => p === '/' || p.startsWith('/c/') },
    { href: '/conversations', label: 'Conversations', Icon: MessagesSquare, count: conversation_count, match: (p) => p === '/conversations' },
    { href: '/checklists', label: 'Checklists', Icon: ListChecks, count: checklist_count, match: (p) => p === '/checklists' },
    { href: '/shortcuts', label: 'USC shortcuts', Icon: BookMarked, match: (p) => p === '/shortcuts' },
  ];
  return (
    <nav aria-label="Workspace" className="grid gap-0.5">
      {items.map(({ href, label, Icon, count, match }) => {
        const active = match(location);
        return (
          <Link
            key={href}
            href={href}
            onClick={on_navigate}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? label : undefined}
            data-testid={'link-nav-' + (href.replace('/', '') || 'home')}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'text-sage' : 'text-faint group-hover:text-sage')} strokeWidth={1.7} />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && count !== undefined && count > 0 && (
              <span className="ml-auto rounded-[5px] bg-sage-soft px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-sage">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
