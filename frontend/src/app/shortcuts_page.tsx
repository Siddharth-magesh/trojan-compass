// Curated official USC links, opened in a new tab.
import { ArrowUpRight, BookOpen, Briefcase, Building2, Globe2, HeartPulse, House, LayoutGrid } from 'lucide-react';
import { independence_note } from '@/lib/app_config';
import { safe_url, url_domain } from '@/lib/safe_url';
import { PageHeader } from '@/app/page_header';

const shortcuts = [
  { name: 'myUSC portal', purpose: 'Registration, finances and your student record.', url: 'https://my.usc.edu/', Icon: LayoutGrid },
  { name: 'Schedule of Classes', purpose: 'Sections, times and instructors each term.', url: 'https://classes.usc.edu/', Icon: BookOpen },
  { name: 'USC Catalogue', purpose: 'Course descriptions and degree requirements.', url: 'https://catalogue.usc.edu/', Icon: Building2 },
  { name: 'International Services', purpose: 'Immigration guidance for international students.', url: 'https://ois.usc.edu/', Icon: Globe2 },
  { name: 'Career Center', purpose: 'Jobs, internships and advising.', url: 'https://careers.usc.edu/', Icon: Briefcase },
  { name: 'Housing', purpose: 'On-campus housing and off-campus resources.', url: 'https://housing.usc.edu/', Icon: House },
  { name: 'Student Health', purpose: 'Appointments, insurance and immunizations.', url: 'https://studenthealth.usc.edu/', Icon: HeartPulse },
];

export function ShortcutsPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-16 sm:px-6 md:px-10">
      <PageHeader eyebrow="Official resources" title="USC shortcuts" body="The places answers usually point back to. Always the final word on policies and deadlines." />
      <ul className="divide-y rounded-xl border bg-card">
        {shortcuts.map(({ name, purpose, url, Icon }) => {
          const href = safe_url(url);
          if (!href) return null;
          return (
            <li key={name}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface" data-testid={'link-shortcut-' + url_domain(href)}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sage"><Icon className="h-4 w-4" strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{name}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{purpose}</span>
                </span>
                <span className="hidden text-[11.5px] text-faint sm:block">{url_domain(href)}</span>
                <ArrowUpRight className="h-4 w-4 text-faint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-[11.5px] text-faint">{independence_note}</p>
    </div>
  );
}
