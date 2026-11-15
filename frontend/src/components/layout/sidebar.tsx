// Left sidebar: brand, new chat, workspace links, recent conversations, privacy note, theme and profile.
import { PanelLeftClose, PanelLeftOpen, Plus, ShieldCheck } from 'lucide-react';
import { use_auth } from '@/lib/auth_provider';
import { use_chat } from '@/lib/chat_provider';
import { use_conversations } from '@/lib/local_store';
import { cn } from '@/lib/utils';
import { BrandLockup } from '@/components/layout/brand_lockup';
import { NavLinks } from '@/components/layout/nav_links';
import { ProfileChip } from '@/components/layout/profile_chip';
import { RecentList } from '@/components/layout/recent_list';
import { ThemeToggle } from '@/components/layout/theme_toggle';
import { use_shell } from '@/components/layout/shell_context';

const is_mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const shortcut_label = is_mac ? '\u2318 K' : 'Ctrl K';

export function Sidebar({ in_drawer = false }: { in_drawer?: boolean }) {
  const { student } = use_auth();
  const { new_chat } = use_chat();
  const { collapsed: collapsed_pref, set_collapsed, set_nav_open } = use_shell();
  const conversations = use_conversations(student?.student_id ?? null);
  const collapsed = collapsed_pref && !in_drawer;
  const close_drawer = in_drawer ? () => set_nav_open(false) : undefined;

  return (
    <div className={cn('flex h-full flex-col gap-6 bg-sidebar px-4 pb-5 pt-7', collapsed && 'items-center px-2.5')}>
      <div className={cn('flex items-center justify-between gap-2 px-2', collapsed && 'flex-col px-0')}>
        <BrandLockup compact={collapsed} />
        {!in_drawer && (
          <button
            type="button"
            onClick={() => set_collapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-testid="button-toggle-sidebar"
            className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          new_chat();
          close_drawer?.();
        }}
        data-testid="button-new-chat"
        title={collapsed ? 'New conversation (' + shortcut_label + ')' : undefined}
        className={cn(
          'group flex items-center justify-between rounded-[10px] border bg-card px-3.5 py-3 text-[13px] shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-input',
          collapsed && 'h-10 w-10 justify-center p-0',
        )}
      >
        <span className="flex items-center gap-2.5">
          <Plus className="h-4 w-4 text-primary transition-transform duration-200 group-hover:rotate-90" />
          {!collapsed && 'New conversation'}
        </span>
        {!collapsed && <kbd className="font-sans text-[10.5px] text-faint">{shortcut_label}</kbd>}
      </button>

      <div className={cn(collapsed && 'w-full')}>
        {!collapsed && <p className="mb-2.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-faint">Your workspace</p>}
        <NavLinks
          collapsed={collapsed}
          conversation_count={conversations.length}
          checklist_count={conversations.filter((c) => c.has_checklist).length}
          on_navigate={close_drawer}
        />
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <p className="mb-2 px-3 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-faint">Recent conversations</p>
          <RecentList items={student ? conversations : []} on_navigate={close_drawer} />
        </div>
      )}

      <div className={cn('mt-auto grid gap-4', collapsed && 'w-full justify-items-center')}>
        {!collapsed && (
          <div className="rounded-[10px] border px-4 py-3.5">
            <p className="flex items-center gap-2 text-[12px] font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-sage" /> Your journey. Your data.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Conversations stay in this browser. Nothing links to a real USC account.</p>
          </div>
        )}
        <ThemeToggle vertical={collapsed} />
        <div className={cn('border-t pt-4', collapsed && 'w-full')}>
          <ProfileChip collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}
