import { useEffect, useMemo, type CSSProperties, type ReactElement } from 'react';
import type { FilterState, ParsedTable } from '@/types';

interface ViewFiltersDialogProps {
  isOpen: boolean;
  filterState: FilterState;
  setFilterState: (nextFilterState: FilterState) => void;
  tables: ParsedTable[];
  onClose: () => void;
}

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.72)',
  display: 'grid',
  placeItems: 'center',
  padding: '1.5rem',
  zIndex: 80,
};

const DIALOG_STYLE: CSSProperties = {
  width: 'min(42rem, 100%)',
  maxHeight: 'min(42rem, calc(100dvh - 3rem))',
  overflow: 'hidden',
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '1rem',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.45)',
  color: '#e2e8f0',
  fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
};

const BUTTON_STYLE: CSSProperties = {
  borderRadius: '0.65rem',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  background: '#132238',
  color: '#e2e8f0',
  padding: '0.55rem 0.85rem',
  cursor: 'pointer',
  font: 'inherit',
};

export default function ViewFiltersDialog({
  isOpen,
  filterState,
  setFilterState,
  tables,
  onClose,
}: ViewFiltersDialogProps): ReactElement | null {
  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.name.localeCompare(b.name)),
    [tables],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allTableIds = new Set(sortedTables.map((table) => table.id));

  return (
    <div style={OVERLAY_STYLE}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-filters-title"
        style={DIALOG_STYLE}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.1rem 1.2rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
          }}
        >
          <div>
            <h2 id="view-filters-title" style={{ margin: 0, fontSize: '1.2rem' }}>
              View Filters
            </h2>
            <p style={{ margin: '0.35rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              Choose how much table detail to render and which tables stay visible.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close view filters" style={BUTTON_STYLE}>
            x
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '1.4rem',
            padding: '1.2rem',
          }}
        >
          <section aria-labelledby="view-filters-field-detail-heading">
            <h3
              id="view-filters-field-detail-heading"
              style={{ margin: '0 0 0.8rem', fontSize: '0.95rem', color: '#cbd5e1' }}
            >
              Field Detail
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {[
                ['full', 'Full Table'],
                ['ref-fields-only', 'Ref Fields Only'],
                ['table-only', 'Table Only'],
              ].map(([value, label]) => {
                const checked = filterState.fieldDetailMode === value;
                return (
                  <label
                    key={value}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderRadius: '999px',
                      border: checked
                        ? '1px solid #38bdf8'
                        : '1px solid rgba(148, 163, 184, 0.24)',
                      background: checked ? 'rgba(14, 165, 233, 0.16)' : '#132238',
                      padding: '0.6rem 0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="field-detail-mode"
                      value={value}
                      checked={checked}
                      onChange={() =>
                        setFilterState({
                          ...filterState,
                          fieldDetailMode: value as FilterState['fieldDetailMode'],
                        })
                      }
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="view-filters-tables-heading">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.8rem',
              }}
            >
              <h3
                id="view-filters-tables-heading"
                style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1' }}
              >
                Tables
              </h3>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={BUTTON_STYLE}
                  onClick={() =>
                    setFilterState({
                      ...filterState,
                      visibleTableIds: new Set(allTableIds),
                    })
                  }
                >
                  Select All
                </button>
                <button
                  type="button"
                  style={BUTTON_STYLE}
                  onClick={() =>
                    setFilterState({
                      ...filterState,
                      visibleTableIds: new Set<string>(),
                    })
                  }
                >
                  Unselect All
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: '18rem',
                overflowY: 'auto',
                border: '1px solid rgba(148, 163, 184, 0.16)',
                borderRadius: '0.85rem',
                background: 'rgba(15, 23, 42, 0.35)',
              }}
            >
              {sortedTables.map((table, index) => {
                const checked = filterState.visibleTableIds.has(table.id);

                return (
                  <label
                    key={table.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '0.8rem 0.9rem',
                      borderTop:
                        index === 0 ? 'none' : '1px solid rgba(148, 163, 184, 0.12)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.7rem' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const nextVisible = new Set(filterState.visibleTableIds);
                          if (checked) {
                            nextVisible.delete(table.id);
                          } else {
                            nextVisible.add(table.id);
                          }

                          setFilterState({
                            ...filterState,
                            visibleTableIds: nextVisible,
                          });
                        }}
                      />
                      <span>{table.name}</span>
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                      {table.columns.length} fields
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
