import { describe, expect, it } from 'vitest';
import { CLIENT_ID_STORAGE_KEY, getClientId } from './clientId.ts';

const uuid = '7d444840-9dc0-4a8e-8f3f-0c3c0a9a7b1e';
const other = '0b1f2b4c-1c84-4d8a-9a52-3f3a9e2f9c11';

const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
};

describe('getClientId', () => {
  it('reuses a stored id', () => {
    expect(getClientId(memory({ [CLIENT_ID_STORAGE_KEY]: uuid }), () => other)).toBe(uuid);
  });

  it('creates and stores an id when there is none, or it is not a UUID', () => {
    for (const storage of [memory(), memory({ [CLIENT_ID_STORAGE_KEY]: 'tampered' })]) {
      expect(getClientId(storage, () => other)).toBe(other);
      expect(storage.data.get(CLIENT_ID_STORAGE_KEY)).toBe(other);
    }
  });

  it('still returns an id when storage throws or is missing', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(getClientId(blocked, () => other)).toBe(other);
    expect(getClientId(null, () => other)).toBe(other);
  });
});
