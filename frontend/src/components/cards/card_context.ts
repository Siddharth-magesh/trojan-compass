// Props passed from an answer to every card renderer.
import type { citation } from '@/lib/api_types';

export type card_ctx = { citations: citation[]; message_id: string };
