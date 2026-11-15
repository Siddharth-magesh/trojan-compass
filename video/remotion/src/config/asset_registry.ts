// Resolves asset ids to files in public/ using available_assets.json (written by scripts/sync_assets.mjs).
// A missing asset returns null, and the scene renders a visible PlaceholderClip instead.
import available from './available_assets.json';

export type asset_id =
  | 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A07M' | 'A08' | 'A09' | 'A10' | 'A11' | 'A12'
  | 'A13' | 'A15' | 'A16';

/** Assets that must exist before the full video may be rendered (checked by scripts/check_placeholders.mjs). */
export const REQUIRED_FOR_FINAL: asset_id[] = ['A02', 'A07', 'A07M'];

export type resolved_asset = { file: string; duration_s?: number; data?: Record<string, unknown> };

export const resolve_asset = (id: asset_id): resolved_asset | null =>
  (available as Record<string, resolved_asset>)[id] ?? null;
