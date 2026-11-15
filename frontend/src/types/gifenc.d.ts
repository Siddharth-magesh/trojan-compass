// Minimal type declarations for the gifenc encoder (the package ships no types).
declare module 'gifenc' {
  export type gif_palette = number[][];
  export function quantize(rgba: Uint8ClampedArray, max_colors: number): gif_palette;
  export function applyPalette(rgba: Uint8ClampedArray, palette: gif_palette): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(index: Uint8Array, width: number, height: number, opts: { palette: gif_palette; delay?: number }): void;
    finish(): void;
    bytes(): Uint8Array<ArrayBuffer>;
  };
}
