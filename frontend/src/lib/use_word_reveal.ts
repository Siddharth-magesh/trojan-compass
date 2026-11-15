// Reveals an answer a few words at a time for a typing effect; returns the full text at once when not animating.
import { useEffect, useState } from 'react';

const words_per_tick = 3;
const tick_ms = 28;

export function use_word_reveal(text: string, animate: boolean): { visible: string; revealing: boolean } {
  const words = text.match(/\S+\s*/g) ?? [];
  const [count, set_count] = useState(animate ? 0 : words.length);

  useEffect(() => {
    if (!animate) {
      set_count(words.length);
      return;
    }
    set_count(0);
    const timer = setInterval(() => {
      set_count((c) => {
        if (c + words_per_tick >= words.length) clearInterval(timer);
        return Math.min(words.length, c + words_per_tick);
      });
    }, tick_ms);
    return () => clearInterval(timer);
    // Restart only when the text or the animate flag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, animate]);

  const revealing = animate && count < words.length;
  return { visible: revealing ? words.slice(0, count).join('') : text, revealing };
}
