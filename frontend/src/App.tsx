// Application root: providers (theme, identity, chat, shell), router and the persistent shell.
import { Router as WouterRouter } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppRoutes } from '@/app/app_routes';
import { AppShell } from '@/components/layout/app_shell';
import { ShellProvider } from '@/components/layout/shell_context';
import { AuthProvider } from '@/lib/auth_provider';
import { ChatProvider } from '@/lib/chat_provider';
import { ThemeProvider } from '@/lib/theme_provider';

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <ChatProvider>
              <ShellProvider>
                <AppShell>
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                </AppShell>
              </ShellProvider>
            </ChatProvider>
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
