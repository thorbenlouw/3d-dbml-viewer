import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ViewFiltersDialog from '@/ui/ViewFiltersDialog';
import type { FilterState, ParsedTable, ParsedTableGroup } from '@/types';

const TABLES: ParsedTable[] = [
  {
    id: 'users',
    name: 'Users',
    columns: [
      {
        name: 'id',
        type: 'int',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
        isUnique: false,
      },
    ],
    tableGroup: 'core',
  },
  {
    id: 'accounts',
    name: 'Accounts',
    columns: [
      {
        name: 'id',
        type: 'int',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
        isUnique: false,
      },
      {
        name: 'user_id',
        type: 'int',
        isPrimaryKey: false,
        isForeignKey: true,
        isNotNull: true,
        isUnique: false,
      },
    ],
    tableGroup: 'core',
  },
  {
    id: 'audit_log',
    name: 'AuditLog',
    columns: [
      {
        name: 'id',
        type: 'int',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
        isUnique: false,
      },
    ],
  },
];

const TABLE_GROUPS: ParsedTableGroup[] = [{ name: 'core' }];

function makeFilterState(): FilterState {
  return {
    fieldDetailMode: 'full',
    visibleTableIds: new Set(TABLES.map((table) => table.id)),
    visibleTableGroupIds: new Set(['core', '__ungrouped__']),
    showTableGroupBoundaries: false,
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
        tableGroups={TABLE_GROUPS}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/ref fields only/i));

    expect(setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldDetailMode: 'ref-fields-only',
        visibleTableIds: new Set(['users', 'accounts', 'audit_log']),
      }),
    );
  });

  it('calls setFilterState with updated visibleTableIds when a table is toggled', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        tableGroups={TABLE_GROUPS}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/users/i));

    expect(setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldDetailMode: 'full',
        visibleTableIds: new Set(['accounts', 'audit_log']),
      }),
    );
  });

  it('calls setFilterState when the checkbox itself is clicked directly', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        tableGroups={TABLE_GROUPS}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /users/i }));

    expect(setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleTableIds: new Set(['accounts', 'audit_log']),
      }),
    );
  });

  it('calls setFilterState with updated visibleTableGroupIds when a table group is toggled', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        tableGroups={TABLE_GROUPS}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/core/i));

    expect(setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleTableGroupIds: new Set(['__ungrouped__']),
      }),
    );
  });

  it('calls setFilterState when the ungrouped checkbox itself is clicked directly', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        tableGroups={TABLE_GROUPS}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /ungrouped/i }));

    expect(setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleTableGroupIds: new Set(['core']),
      }),
    );
  });

  it('calls setFilterState when a table-group checkbox itself is clicked directly', () => {
    const setFilterState = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={setFilterState}
        tables={TABLES}
        tableGroups={TABLE_GROUPS}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /core/i }));

    expect(setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleTableGroupIds: new Set(['__ungrouped__']),
      }),
    );
  });

  it('closes on Escape and keeps tables sorted alphabetically', () => {
    const onClose = vi.fn();

    render(
      <ViewFiltersDialog
        isOpen
        filterState={makeFilterState()}
        setFilterState={vi.fn()}
        tables={TABLES}
        tableGroups={TABLE_GROUPS}
        onClose={onClose}
      />,
    );

    const labels = screen.getAllByText(/Accounts|AuditLog|Users/).map((node) => node.textContent);
    expect(labels).toEqual(['Accounts', 'AuditLog', 'Users']);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
