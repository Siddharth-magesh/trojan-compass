// Builds a real ReadableStream SSE Response from a list of delayed events; honours AbortSignal.
export type timed_event = { delay: number; event: string; data: unknown };

export const network_drop = '__network_drop';

export function sse_response(
  events: timed_event[],
  signal: AbortSignal | null | undefined,
  on_emit: (event: string) => void,
): Response {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let index = 0;
      signal?.addEventListener(
        'abort',
        () => {
          stopped = true;
          clearTimeout(timer);
          try {
            controller.error(new DOMException('Aborted', 'AbortError'));
          } catch {
            /* already closed */
          }
        },
        { once: true },
      );
      const emit_next = () => {
        if (stopped) return;
        const next = events[index++];
        if (!next) {
          controller.close();
          return;
        }
        timer = setTimeout(() => {
          if (stopped) return;
          if (next.event === network_drop) {
            stopped = true;
            controller.error(new TypeError('Network connection lost'));
            return;
          }
          controller.enqueue(encoder.encode('event: ' + next.event + '\ndata: ' + JSON.stringify(next.data) + '\n\n'));
          on_emit(next.event);
          emit_next();
        }, next.delay);
      };
      emit_next();
    },
    cancel() {
      stopped = true;
      clearTimeout(timer);
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
