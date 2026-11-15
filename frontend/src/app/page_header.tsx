// Shared serif header for secondary workspace pages.
export function PageHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <header className="pb-6 pt-10">
      <p className="flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-px w-5 bg-sage/50" /> {eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-[36px] font-normal leading-tight tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 max-w-[520px] text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
    </header>
  );
}
