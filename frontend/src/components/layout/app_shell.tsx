// Responsive application frame: sidebar (drawer on mobile), main column and contextual right panel.
import { useEffect, type ReactNode } from 'react';
import { use_chat } from '@/lib/chat_provider';
import { use_media_query } from '@/lib/use_media_query';
import { panel_has_content, use_panel_data } from '@/lib/use_panel_data';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { DemoLoginDialog } from '@/components/layout/demo_login_dialog';
import { RightPanel } from '@/components/layout/right_panel';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top_bar';
import { use_shell } from '@/components/layout/shell_context';

export function AppShell({ children }: { children: ReactNode }) {
  const { new_chat } = use_chat();
  const shell = use_shell();
  const panel = use_panel_data();
  const has_panel = panel_has_content(panel);
  const wide = use_media_query('(min-width: 1280px)');
  const mobile = use_media_query('(max-width: 767px)');

  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        new_chat();
        requestAnimationFrame(() => document.getElementById('composer-input')?.focus());
      }
    };
    window.addEventListener('keydown', on_key);
    return () => window.removeEventListener('keydown', on_key);
  }, [new_chat]);

  const set_panel_open = shell.set_panel_open;
  useEffect(() => {
    if (wide || !has_panel) set_panel_open(false);
  }, [wide, has_panel, set_panel_open]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className={cn('hidden shrink-0 border-r lg:block', shell.collapsed ? 'w-[76px]' : 'w-[256px]')} aria-label="Sidebar">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar panel_available={has_panel} panel_count={panel.citations.length} />
        <main id="main" className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>

      {wide && has_panel && (
        <aside className="w-[320px] shrink-0 overflow-y-auto border-l bg-surface scrollbar-thin" aria-label="Sources and progress">
          <RightPanel data={panel} />
        </aside>
      )}

      <Sheet open={shell.nav_open} onOpenChange={shell.set_nav_open}>
        <SheetContent side="left" className="w-[288px] max-w-[85vw] border-r p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar in_drawer />
        </SheetContent>
      </Sheet>

      <Sheet open={shell.panel_open && !wide && has_panel} onOpenChange={shell.set_panel_open}>
        <SheetContent
          side={mobile ? 'bottom' : 'right'}
          className={cn('overflow-y-auto bg-surface p-0', mobile ? 'max-h-[82dvh] rounded-t-[18px]' : 'w-[340px] sm:max-w-[340px]')}
        >
          <SheetTitle className="sr-only">Sources and progress</SheetTitle>
          <SheetDescription className="sr-only">Sources for the selected answer and checklist progress.</SheetDescription>
          {mobile && <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />}
          <RightPanel data={panel} />
        </SheetContent>
      </Sheet>

      <DemoLoginDialog />
    </div>
  );
}
