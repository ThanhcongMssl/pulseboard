// gifenc ships no types; these cover the parts demo/record.ts uses.
declare module 'gifenc' {
  export type Palette = number[][];
  const gifenc: {
    quantize: typeof quantize;
    applyPalette: typeof applyPalette;
    GIFEncoder: typeof GIFEncoder;
  };
  export default gifenc;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: Palette;
        delay?: number;
        transparent?: boolean;
        transparentIndex?: number;
        dispose?: number;
        repeat?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
}
