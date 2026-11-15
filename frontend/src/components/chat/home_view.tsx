// Home state: calm centered greeting, illustrative journey GIF, the composer, and all helpers behind a recommendations toggle.
import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Briefcase, ChevronDown, Globe2, GraduationCap, House, MapPin, UserRound } from 'lucide-react';
import { use_auth } from '@/lib/auth_provider';
import { use_chat } from '@/lib/chat_provider';
import { cn } from '@/lib/utils';
import { JourneyGif } from '@/components/chat/journey_gif';
import usc_shield from '@/assets/usc_shield.png';

const starters = [
  { title: 'Find your academic path', body: 'Courses, prerequisites and a schedule that fits your goals.', prompt: 'Help me pick two courses for next semester', Icon: BookOpen, tone: 'bg-gold-soft text-amber-ink' },
  { title: 'Find a place to call home', body: 'Compare housing around campus by rent and distance.', prompt: 'Find housing under $1,200 a month near campus', Icon: House, tone: 'bg-cardinal-soft text-primary' },
  { title: 'Take your next career step', body: 'Campus jobs and roles, with eligibility made clear.', prompt: 'Find a part-time technical job on campus', Icon: Briefcase, tone: 'bg-sage-soft text-sage' },
  { title: 'Feel at home from day one', body: 'The offices and services new international students need.', prompt: "I'm a new international student. Which services should I know about?", Icon: Globe2, tone: 'bg-accent text-accent-foreground' },
];

const chips = [
  'Plan my first month: courses, housing and a campus job',
  'Give me a pre-semester checklist',
  'Help me with housing',
  'Housing near the Health Sciences Campus',
];

function first_name(name: string): string {
  return name.split(' ')[0] ?? name;
}

export function HomeView({ composer }: { composer: ReactNode }) {
  const { student, checking, set_login_open } = use_auth();
  const { send } = use_chat();
  const reduce = useReducedMotion();
  const [open, set_open] = useState(false);
  const panel_id = useId();
  const rise = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.06 * i, ease: 'easeOut' as const } });

  const tags = student
    ? [
        student.level && { label: student.level + ' student', Icon: GraduationCap },
        student.program && { label: student.program, Icon: MapPin },
        student.international && { label: 'International student', Icon: Globe2 },
      ].filter((t): t is { label: string; Icon: typeof Globe2 } => Boolean(t))
    : [];

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col pt-8 md:pt-14" aria-labelledby="home-title">
      <motion.div className="text-center" {...rise(0)}>
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-card shadow-soft ring-1 ring-border dark:bg-[hsl(40_40%_94%)]">
          <img src={usc_shield} alt="University of Southern California shield" className="h-7 w-auto" data-testid="img-usc-shield" />
        </span>
        <h1 id="home-title" className="font-serif text-[30px] font-normal leading-tight tracking-[-0.02em] md:text-[36px]" data-testid="text-greeting">
          {checking ? '\u00a0' : student ? <>Hey {first_name(student.display_name)}, <em className="text-primary">where to next?</em></> : <>Your USC path, <em className="text-primary">one question at a time.</em></>}
        </h1>
        <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-relaxed text-muted-foreground">
          Courses, housing, jobs or getting settled. Calm answers with their sources.
        </p>
      </motion.div>

      <motion.div className="mt-6" {...rise(1)}>
        <JourneyGif student={checking ? null : student} visit_key="home" />
      </motion.div>

      <motion.div className="mt-2" {...rise(2)}>{composer}</motion.div>

      <motion.div className="mb-10 mt-1 flex flex-col items-center" {...rise(3)}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => set_open((o) => !o)}
            aria-expanded={open}
            aria-controls={panel_id}
            data-testid="button-toggle-recommendations"
            className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-input hover:text-foreground"
          >
            Recommendations <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
          </button>
          {!checking && !student && (
            <button type="button" onClick={() => set_login_open(true)} data-testid="button-home-demo-login" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-primary hover:bg-cardinal-soft">
              <UserRound className="h-3.5 w-3.5" /> Choose a demo student
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panel_id}
              key="recs"
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="mt-5 w-full"
            >
              <div className="mb-6 flex flex-wrap gap-2">
                {checking && [0, 1, 2].map((i) => <span key={i} className="h-7 w-28 animate-pulse rounded-md bg-muted" />)}
                {tags.map(({ label, Icon }, i) => (
                  <span key={label} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] text-muted-foreground', i === 0 && 'border-transparent bg-sage-soft text-sage')}>
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </span>
                ))}
                {!checking && !student && (
                  <button
                    type="button"
                    onClick={() => set_login_open(true)}
                    data-testid="button-home-choose-student"
                    className="group inline-flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-card px-3.5 py-2.5 text-left transition-all duration-200 hover:-translate-y-px hover:border-primary/60"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-cardinal-soft text-primary"><UserRound className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-[13px] font-medium">Choose a demo student</span>
                      <span className="block text-[11.5px] text-muted-foreground">Sample profiles only. No real sign-in.</span>
                    </span>
                    <ArrowUpRight className="ml-2 h-4 w-4 text-faint transition-colors group-hover:text-primary" />
                  </button>
                )}
              </div>

              <div className="mb-3.5 flex items-baseline justify-between">
                <h2 className="text-[13px] font-medium">Where shall we start?</h2>
                <span className="text-[11px] text-faint">A little help goes a long way</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {starters.map(({ title, body, prompt, Icon, tone }, i) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => send(prompt)}
                    data-testid={'button-starter-' + i}
                    className="group relative min-h-[112px] rounded-xl border bg-card p-5 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-input hover:shadow-soft"
                  >
                    <span className={cn('mb-3 grid h-8 w-8 place-items-center rounded-lg', tone)}><Icon className="h-4 w-4" strokeWidth={1.8} /></span>
                    <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-faint transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    <span className="block text-[14px] font-medium">{title}</span>
                    <span className="mt-1.5 block pr-4 text-[12.5px] leading-relaxed text-muted-foreground">{body}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">Or, something on your mind?</p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c, i) => (
                    <button key={c} type="button" onClick={() => send(c)} data-testid={'button-suggestion-' + i} className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3.5 py-2 text-[12px] text-muted-foreground transition-colors duration-200 hover:border-input hover:text-foreground">
                      {c} <ArrowUpRight className="h-3 w-3 opacity-50" />
                    </button>
                  ))}
                  <button type="button" onClick={() => send('/error')} data-testid="button-suggestion-error" className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3.5 py-2 text-[12px] text-faint transition-colors hover:text-foreground" title="Cycles through each error state">
                    Preview error states
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
