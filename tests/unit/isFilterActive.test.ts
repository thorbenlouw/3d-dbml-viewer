import { describe, expect, it } from 'vitest';
import { isFilterActive } from '@/parser';
import type { FilterState } from '@/types';

function makeFilterState(
  visibleTableIds: string[],
  fieldDetailMode: FilterState['fieldDetailMode'] = 'full',
): FilterState {
  return {
    fieldDetailMode,
    visibleTableIds: new Set(visibleTableIds),
  };
}

describe('isFilterActive', () => {
  it('returns false when the filter matches the default state', () => {
    const defaultState = makeFilterState(['users', 'posts', 'comments']);

    const result = isFilterActive(
      makeFilterState(['users', 'posts', 'comments']),
      defaultState,
    );

    expect(result).toBe(false);
  });

  it('returns true when the field detail mode differs from the default', () => {
    const defaultState = makeFilterState(['users', 'posts', 'comments'], 'full');

    const result = isFilterActive(
      makeFilterState(['users', 'posts', 'comments'], 'table-only'),
      defaultState,
    );

    expect(result).toBe(true);
  });

  it('returns true when any table is hidden compared with the default', () => {
    const defaultState = makeFilterState(['users', 'posts', 'comments']);

    const result = isFilterActive(makeFilterState(['users', 'posts']), defaultState);

    expect(result).toBe(true);
  });

  it('returns true when the visible table set differs even if sizes match', () => {
    const defaultState = makeFilterState(['users', 'posts']);

    const result = isFilterActive(makeFilterState(['users', 'comments']), defaultState);

    expect(result).toBe(true);
  });
});
