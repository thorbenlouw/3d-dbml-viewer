import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ViewFiltersDialog from '@/ui/ViewFiltersDialog';
import type { FilterState, ParsedTable } from '@/types';

const TABLES: ParsedTable[] = [
  { id: 'users', name: 'Users', columns: [{ name: 'id', type: 'int', isPrimaryKey: true, isForeignKey: false, isNotNull: true, isUnique: false }] },
  {
    id: 'accounts',
    name: 'Accounts',
    columns: [
      { name: 'id', type: 'int', isPrimaryKey: true, isForeignKey: false, isNotNull: true, isUnique: false },
      { name: 'user_id', type: 'int', isPrimaryKey: false, isForeignKey: true, isNotNull: true, isUnique: false },
    ],
  },
];

function makeFilterState(): FilterState {
  return {
    fieldDetailMode: 'full',
    visibleTableIds: new Set(TABLES.map((table) => table.id)),
  };
}

afterEach(() => {
  cleanup();
});

describe('ViewFiltersDialog', () => {
  it('calls setFilterState with the chosen field detail mode', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/ref fields only/i));

    expect(setFilterState).toHaveBeenCalledWith({
      fieldDetailMode: 'ref-fields-only',
      visibleTableIds: new Set(['users', 'accounts']),
    });
  });

  it('calls setFilterState with updated visibleTableIds when a table is toggled', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/users/i));

    expect(setFilterState).toHaveBeenCalledWith({
      fieldDetailMode: 'full',
      visibleTableIds: new Set(['accounts']),
    });
  });

  it('closes on Escape and keeps tables sorted alphabetically', () => {
    const onClose = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={vi.fn()}
        tables={TABLES}
        onClose={onClose}
      />,
    );

    const labels = screen.getAllByText(/Accounts|Users/).map((node) => node.textContent);
    expect(labels).toEqual(['Accounts', 'Users']);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
