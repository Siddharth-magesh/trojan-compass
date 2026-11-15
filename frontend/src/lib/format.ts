// Display formatters for dates, durations, money and names.

function parse_day(iso: string): Date | null {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function format_date(iso?: string | null): string | null {
  if (!iso) return null;
  const d = parse_day(iso);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

export function format_seconds(ms: number): string {
  const s = ms / 1000;
  return s < 10 ? s.toFixed(1) + 's' : Math.round(s) + 's';
}

export function format_usd(amount: number, decimals?: number): string {
  const digits = decimals ?? (Number.isInteger(amount) ? 0 : 2);
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function relative_day(iso: string): string {
  const d = parse_day(iso);
  if (!d) return '';
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + ' days ago';
  return format_date(iso) ?? '';
}
