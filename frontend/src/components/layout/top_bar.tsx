// Top bar: mobile menu, breadcrumb, sample-data status and the contextual panel toggle.
import { Menu, PanelRight, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import { app_name } from '@/lib/app_config';
import { is_mock_mode } from '@/lib/api_client';
import { use_chat } from '@/lib/chat_provider';
import { BrandMark } from '@/components/layout/brand_mark';
import { use_shell } from '@/components/layout/shell_context';

const titles: Record<string, string> = {
  '/conversations': 'Conversations',
  '/checklists': 'Checklists',
  '/shortcuts': 'USC shortcuts',
};

export function TopBar({ panel_available, panel_count }: { panel_available: boolean; panel_count: number }) {
  const [location] = useLocation();
  const { set_nav_open, set_panel_open } = use_shell();
  const { new_chat } = use_chat();
  const title = titles[location] ?? 'Ask ' + app_name;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 md:h-[72px] md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => set_nav_open(true)}
          aria-label="Open navigation"
          data-testid="button-open-nav"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BrandMark className="h-7 w-[26px] md:hidden" />
        <span className="font-serif text-[19px] tracking-tight text-primary md:hidden">{app_name}</span>
        <p className="hidden truncate text-[12.5px] text-muted-foreground md:block">
          My workspace <span className="mx-2.5 text-faint">/</span>
          <span className="font-medium text-foreground/80">{title}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {is_mock_mode && (
          <span className="hidden items-center gap-1.5 rounded-full border bg-surface px-2.5 py-1.5 text-[10.5px] text-muted-foreground sm:inline-flex" data-testid="status-mock-mode">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />
            Sample data preview
          </span>
        )}
        {panel_available && (
          <button
            type="button"
            onClick={() => set_panel_open(true)}
            data-testid="button-open-panel"
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-[12px] text-muted-foreground transition-colors hover:text-foreground xl:hidden"
          >
            <PanelRight className="h-4 w-4" />
            <span className="hidden sm:inline">Sources</span>
            {panel_count > 0 && <span className="tabular-nums text-faint">{panel_count}</span>}
          </button>
        )}
        <button
          type="button"
          onClick={new_chat}
          aria-label="New conversation"
          data-testid="button-new-chat-mobile"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
