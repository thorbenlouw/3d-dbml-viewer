import { describe, it, expect } from 'vitest';
import {
  resolveTableHeaderColor,
  resolveLinkColor,
  resolveGroupBoundaryColor,
} from '@/renderer/colorUtils';

describe('resolveTableHeaderColor', () => {
  it('returns the color when a valid hex color is provided', () => {
    expect(resolveTableHeaderColor('#3b82f6')).toBe('#3b82f6');
  });

  it('returns the color when a short hex is provided', () => {
    expect(resolveTableHeaderColor('#fff')).toBe('#fff');
  });

  it('returns the default when color is undefined', () => {
    const result = resolveTableHeaderColor(undefined);
    expect(result).toBe('#1565C0');
  });

  it('returns the default when color is an empty string', () => {
    const result = resolveTableHeaderColor('');
    expect(result).toBe('#1565C0');
  });

  it('returns the default when color is whitespace only', () => {
    const result = resolveTableHeaderColor('   ');
    expect(result).toBe('#1565C0');
  });

  it('returns the default when color is an invalid string', () => {
    const result = resolveTableHeaderColor('not-a-color');
    expect(result).toBe('#1565C0');
  });

  it('accepts named CSS colors', () => {
    expect(resolveTableHeaderColor('red')).toBe('red');
  });
});

describe('resolveLinkColor', () => {
  it('returns the provided color when valid', () => {
    expect(resolveLinkColor('#f59e0b')).toBe('#f59e0b');
  });

  it('returns the default link color when undefined', () => {
    expect(resolveLinkColor(undefined)).toBe('#29B6F6');
  });

  it('returns the default link color for invalid input', () => {
    expect(resolveLinkColor('##bad')).toBe('#29B6F6');
  });
});

describe('resolveGroupBoundaryColor', () => {
  it('returns the provided color when valid', () => {
    expect(resolveGroupBoundaryColor('#8b5cf6')).toBe('#8b5cf6');
  });

  it('returns the default group color when undefined', () => {
    expect(resolveGroupBoundaryColor(undefined)).toBe('#29B6F6');
  });

  it('returns the default group color for invalid input', () => {
    expect(resolveGroupBoundaryColor('purple-ish')).toBe('#29B6F6');
  });
});
