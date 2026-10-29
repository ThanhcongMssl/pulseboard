// Seeded randomness for the simulated sources. Every value is derived from a
// key like ("shopify", date, channel), so a given day always produces the
// same data no matter when or how often it is fetched.

/** 32-bit FNV-1a hash of a string. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a tiny, fast PRNG; plenty for demo data. Returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface Random {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  between(min: number, max: number): number;
}

/** A random stream seeded by the given key parts. */
export function seeded(...key: (string | number)[]): Random {
  const next = mulberry32(hash(key.join('|')));
  return { next, between: (min, max) => min + next() * (max - min) };
}
