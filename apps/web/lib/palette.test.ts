import { describe, expect, it } from 'vitest';
import { matchCommand } from './palette.ts';

describe('matchCommand', () => {
  it('needs every word, in any order, from the text or keywords', () => {
    expect(matchCommand('Add widget: All orders', 'add orders')).toBe(1);
    expect(matchCommand('Brand search', 'paid search', ['campaign', 'Paid search'])).toBe(1);
    expect(matchCommand('Retargeting · Site visitors', 'RETARGET')).toBe(1);
    expect(matchCommand('Anything', '  ')).toBe(1);
  });

  it('rejects letters scattered across a command', () => {
    expect(matchCommand('Custom range…', 'undo', ['range', 'dates', 'from', 'to'])).toBe(0);
    expect(matchCommand('Undo layout change', 'undo', ['undo'])).toBe(1);
  });
});
