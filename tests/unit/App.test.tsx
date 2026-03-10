import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FilterState, ParsedSchema } from '@/types';
import App from '@/App';

const { applyFilters, parseDatabaseSchema, defaultFilterState, isFilterActive } = vi.hoisted(() => ({
  applyFilters: vi.fn<(schema: ParsedSchema, filterState: FilterState) => ParsedSchema>(),
  parseDatabaseSchema: vi.fn<(dbml: string) => ParsedSchema>(),
  defaultFilterState: vi.fn(),
  isFilterActive: vi.fn(() => false),
}));

vi.mock('@/parser', () => ({
  ParseError: class ParseError extends Error {},
  applyFilters,
  defaultFilterState,
  isFilterActive,
  parseDatabaseSchema,
}));

const sceneProps = vi.hoisted(() => ({
  current: null as
    | {
        schema: ParsedSchema;
        sourceSchema?: ParsedSchema;
        fieldDetailMode?: FilterState['fieldDetailMode'];
      }
    | null,
}));

vi.mock('@/renderer/Scene', () => ({
  default: function SceneMock(props: {
    schema: ParsedSchema;
    sourceSchema?: ParsedSchema;
    fieldDetailMode?: FilterState['fieldDetailMode'];
  }): ReactElement {
    sceneProps.current = props;
    return (
      <div data-testid="scene-table-count">
        {props.schema.tables.length}:{props.fieldDetailMode ?? 'missing'}
      </div>
    );
  },
}));

vi.mock('@/ui/ErrorBanner', () => ({
  default: function ErrorBannerMock(): ReactElement | null {
    return null;
  },
}));

vi.mock('@/ui/LoadFileButton', () => ({
  default: function LoadFileButtonMock(props: { onLoad: (text: string) => void }): ReactElement {
    return (
      <button type="button" onClick={() => props.onLoad('second schema')}>
        trigger schema load
      </button>
    );
  },
}));

describe('App', () => {
  beforeEach(() => {
    sceneProps.current = null;
    applyFilters.mockReset();
    parseDatabaseSchema.mockReset();
    defaultFilterState.mockReset();
    isFilterActive.mockReset();
    isFilterActive.mockReturnValue(false);
    defaultFilterState.mockImplementation((schema: ParsedSchema) => ({
      fieldDetailMode: schema.tables.length > 1 ? 'table-only' : 'full',
      visibleTableIds: new Set(schema.tables.map((table) => table.id)),
    }));
    applyFilters.mockImplementation((schema, filterState) => ({
      ...schema,
      tables: schema.tables.filter((table) => filterState.visibleTableIds.has(table.id)),
      refs: schema.refs.filter(
        (ref) =>
          filterState.visibleTableIds.has(ref.sourceId) &&
          filterState.visibleTableIds.has(ref.targetId),
      ),
    }));

    const firstSchema: ParsedSchema = {
      tables: [{ id: 'posts', name: 'posts', columns: [] }],
      refs: [],
    };
    const secondSchema: ParsedSchema = {
      tables: [
        { id: 'users', name: 'users', columns: [] },
        { id: 'comments', name: 'comments', columns: [] },
      ],
      refs: [
        {
          id: 'users-comments',
          sourceId: 'users',
          targetId: 'comments',
          sourceFieldNames: ['id'],
          targetFieldNames: ['user_id'],
        },
      ],
    };

    parseDatabaseSchema
      .mockReturnValueOnce(firstSchema)
      .mockReturnValueOnce(secondSchema);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('first schema'),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('recomputes default filter state after each successful schema load', async () => {
    const firstSchema: ParsedSchema = {
      tables: [{ id: 'posts', name: 'posts', columns: [] }],
      refs: [],
    };
    const secondSchema: ParsedSchema = {
      tables: [
        { id: 'users', name: 'users', columns: [] },
        { id: 'comments', name: 'comments', columns: [] },
      ],
      refs: [
        {
          id: 'users-comments',
          sourceId: 'users',
          targetId: 'comments',
          sourceFieldNames: ['id'],
          targetFieldNames: ['user_id'],
        },
      ],
    };

    render(<App />);

    await waitFor(() => {
      expect(defaultFilterState).toHaveBeenCalledWith(firstSchema);
    });

    fireEvent.click(screen.getByRole('button', { name: 'trigger schema load' }));

    await waitFor(() => {
      expect(defaultFilterState).toHaveBeenCalledWith(secondSchema);
    });
  });

  it('opens the view filters dialog from the toolbar button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open view filters/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));

    expect(screen.getByRole('dialog', { name: 'View Filters' })).toBeInTheDocument();
  });

  it('live-updates the scene schema and field detail mode from the view filters dialog', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open view filters/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'trigger schema load' }));

    await waitFor(() => {
      expect(sceneProps.current?.schema.tables.map((table) => table.id)).toEqual([
        'users',
        'comments',
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));
    fireEvent.click(screen.getByLabelText('Table Only'));

    await waitFor(() => {
      expect(sceneProps.current?.fieldDetailMode).toBe('table-only');
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /comments/i }));

    await waitFor(() => {
      expect(applyFilters).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tables: expect.arrayContaining([
            expect.objectContaining({ id: 'users' }),
            expect.objectContaining({ id: 'comments' }),
          ]),
        }),
        expect.objectContaining({
          fieldDetailMode: 'table-only',
          visibleTableIds: new Set(['users']),
        }),
      );
      expect(sceneProps.current?.schema.tables.map((table) => table.id)).toEqual(['users']);
      expect(sceneProps.current?.sourceSchema?.tables.map((table) => table.id)).toEqual([
        'users',
        'comments',
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: /close view filters/i }));

    expect(screen.queryByRole('dialog', { name: 'View Filters' })).not.toBeInTheDocument();
  });
});
