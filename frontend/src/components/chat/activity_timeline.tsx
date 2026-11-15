// Agent activity timeline driven by status events: live steps, parallel agent pills, collapsed summary.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, CircleSlash, Loader2, X } from 'lucide-react';
import type { agent_node, status_state } from '@/lib/api_types';
import type { activity_step, assistant_message } from '@/lib/chat_types';
import { format_seconds } from '@/lib/format';
import { cn } from '@/lib/utils';

const agent_nodes: agent_node[] = ['academic_agent', 'housing_agent', 'career_agent', 'student_services_agent'];
const stage_order: (agent_node | 'agents')[] = ['input_guard', 'supervisor', 'agents', 'verifier', 'synthesizer', 'output_guard'];

function StateIcon({ state, className }: { state: status_state; className?: string }) {
  if (state === 'started') return <Loader2 className={cn('h-3.5 w-3.5 animate-spin text-primary', className)} aria-label="In progress" />;
  if (state === 'failed') return <X className={cn('h-3.5 w-3.5 text-destructive', className)} aria-label="Failed" />;
  return <Check className={cn('h-3.5 w-3.5 text-sage', className)} aria-label="Done" />;
}

function summary(m: assistant_message): string {
  const agents = m.steps.filter((s) => agent_nodes.includes(s.node)).length;
  const sources = m.final?.citations.length ?? 0;
  const time = m.duration_ms !== undefined ? format_seconds(m.duration_ms) : null;
  if (m.phase === 'cancelled') return ['Stopped', time].filter(Boolean).join(' \u00b7 ');
  if (m.phase === 'error') return ['Stopped early', time].filter(Boolean).join(' \u00b7 ');
  const parts = ['Used ' + agents + (agents === 1 ? ' agent' : ' agents'), time];
  if (m.final) parts.push(sources + (sources === 1 ? ' source' : ' sources'));
  return parts.filter(Boolean).join(' \u00b7 ');
}

function StepRow({ step }: { step: activity_step }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px]">
      <StateIcon state={step.state} />
      <span className={cn(step.state === 'started' ? 'text-foreground' : 'text-muted-foreground')}>{step.label}</span>
      {step.state !== 'started' && step.elapsed_ms !== undefined && (
        <span className="text-[10.5px] tabular-nums text-faint">{format_seconds(step.elapsed_ms)}</span>
      )}
    </div>
  );
}

function AgentPills({ steps }: { steps: activity_step[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-6">
      {steps.map((s) => (
        <motion.span
          key={s.node}
          layout
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px]',
            s.state === 'started' && 'border-primary/25 bg-cardinal-soft/50 text-foreground',
            s.state === 'done' && 'bg-sage-soft/60 text-sage',
            s.state === 'failed' && 'border-destructive/30 text-destructive',
          )}
        >
          <StateIcon state={s.state} className="h-3 w-3" />
          {s.label}
        </motion.span>
      ))}
    </div>
  );
}

export function ActivityTimeline({ message }: { message: assistant_message }) {
  const reduce = useReducedMotion();
  const live = message.phase === 'streaming';
  const [open, set_open] = useState(live);

  useEffect(() => {
    set_open(live);
  }, [live]);

  if (message.steps.length === 0 && !live) return null;
  const agents = message.steps.filter((s) => agent_nodes.includes(s.node));
  const current = [...message.steps].reverse().find((s) => s.state === 'started');

  return (
    <div className="mb-4 overflow-hidden rounded-xl border bg-surface/70">
      <button
        type="button"
        onClick={() => set_open(!open)}
        aria-expanded={open}
        data-testid={'button-toggle-activity-' + message.id}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {live ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : message.phase === 'cancelled' ? <CircleSlash className="h-3.5 w-3.5" /> : <StateIcon state={message.phase === 'error' ? 'failed' : 'done'} />}
        <span className="min-w-0 flex-1 truncate">{live ? (current ? current.label + '\u2026' : 'Getting started\u2026') : summary(message)}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="relative grid gap-2.5 border-t px-3.5 pb-3.5 pt-3">
              <span className="absolute bottom-5 left-[21px] top-5 w-px bg-border" aria-hidden="true" />
              {stage_order.map((stage) => {
                if (stage === 'agents') {
                  if (agents.length === 0) return null;
                  return (
                    <div key="agents" className="relative grid gap-1.5">
                      <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
                        <StateIcon state={agents.some((a) => a.state === 'started') ? 'started' : 'done'} />
                        {agents.length > 1 ? 'Consulting ' + agents.length + ' agents in parallel' : 'Consulting a specialist'}
                      </div>
                      <AgentPills steps={agents} />
                    </div>
                  );
                }
                const step = message.steps.find((s) => s.node === stage);
                return step ? (
                  <motion.div key={stage} className="relative" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                    <StepRow step={step} />
                  </motion.div>
                ) : null;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
