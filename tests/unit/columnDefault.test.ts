import { describe, expect, it } from 'vitest';
import { formatColumnDefaultLabel, formatColumnDefaultValue } from '@/renderer/columnDefault';

describe('column default formatting', () => {
  it('formats number and boolean defaults as raw values', () => {
    expect(formatColumnDefaultLabel({ type: 'number', value: '42' })).toBe('= 42');
    expect(formatColumnDefaultLabel({ type: 'boolean', value: 'true' })).toBe('= true');
  });

  it('formats string defaults with quotes', () => {
    expect(formatColumnDefaultLabel({ type: 'string', value: 'pending' })).toBe("= 'pending'");
  });

  it('formats expression defaults with backticks', () => {
    expect(formatColumnDefaultValue({ type: 'expression', value: 'now()' })).toBe('`now()`');
  });
});
