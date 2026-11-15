// Link safety: only http(s) URLs are rendered as links; everything else is dropped.

export function safe_url(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function url_domain(url?: string | null): string {
  const safe = safe_url(url);
  if (!safe) return '';
  return new URL(safe).hostname.replace(/^www\./, '');
}
