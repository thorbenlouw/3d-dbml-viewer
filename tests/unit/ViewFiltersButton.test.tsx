import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ViewFiltersButton from '@/ui/ViewFiltersButton';

afterEach(() => {
  cleanup();
});

describe('ViewFiltersButton', () => {
  it('hides the active-filter indicator when filters are at their defaults', () => {
    render(<ViewFiltersButton isActive={false} onClick={vi.fn()} />);

    expect(screen.queryByTestId('view-filters-active-indicator')).not.toBeInTheDocument();
  });

  it('shows the active-filter indicator when non-default filters are active', () => {
    render(<ViewFiltersButton isActive onClick={vi.fn()} />);

    expect(screen.getByTestId('view-filters-active-indicator')).toBeInTheDocument();
  });
});
