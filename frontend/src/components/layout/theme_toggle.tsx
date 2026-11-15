// Three-way theme switch (light, system, dark) for the sidebar footer.
import { Monitor, Moon, Sun } from 'lucide-react';
import { use_theme, type theme_choice } from '@/lib/theme_provider';
import { cn } from '@/lib/utils';

const options: { value: theme_choice; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'system', label: 'System theme', Icon: Monitor },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
];

export function ThemeToggle({ vertical = false }: { vertical?: boolean }) {
  const { choice, set_choice } = use_theme();
  return (
    <div role="radiogroup" aria-label="Theme" className={cn('inline-flex rounded-lg border bg-background/60 p-0.5', vertical && 'flex-col')}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          data-testid={'button-theme-' + value}
          onClick={() => set_choice(value)}
          className={cn(
            'grid h-7 w-8 place-items-center rounded-md text-muted-foreground transition-colors duration-200 hover:text-foreground',
            choice === value && 'bg-card text-foreground shadow-soft',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
