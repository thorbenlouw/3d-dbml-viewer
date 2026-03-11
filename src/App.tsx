import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  applyFilters,
  defaultFilterState,
  isFilterActive,
  parseDatabaseSchema,
  ParseError,
} from '@/parser';
import Scene from '@/renderer/Scene';
import ErrorBanner from '@/ui/ErrorBanner';
import LoadFileButton from '@/ui/LoadFileButton';
import ViewFiltersButton from '@/ui/ViewFiltersButton';
import ViewFiltersDialog from '@/ui/ViewFiltersDialog';
import type { FilterState, ParsedSchema } from '@/types';
import type { ReactElement } from 'react';

export default function App(): ReactElement {
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [filterState, setFilterState] = useState<FilterState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isViewFiltersOpen, setIsViewFiltersOpen] = useState(false);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

  const handleSchemaLoad = useCallback((text: string): void => {
    try {
      const parsed = parseDatabaseSchema(text);
      setSchema(parsed);
      setFilterState(defaultFilterState(parsed));
      setIsViewFiltersOpen(false);
      setLoadError(null);
    } catch (err) {
      if (err instanceof ParseError) {
        setLoadError(err.message);
      } else {
        setLoadError('An unexpected error occurred');
      }
    }
  }, []);

  const handleReloadFile = useCallback(async (): Promise<void> => {
    if (!fileHandle) return;
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      handleSchemaLoad(text);
    } catch (err) {
      setLoadError(
        `Failed to reload file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [fileHandle, handleSchemaLoad]);

  const visibleSchema =
    schema !== null && filterState !== null ? applyFilters(schema, filterState) : schema;
  const activeDefaultFilterState = useMemo(
    () => (schema !== null ? defaultFilterState(schema) : null),
    [schema],
  );
  const hasActiveFilters =
    filterState !== null && activeDefaultFilterState !== null
      ? isFilterActive(filterState, activeDefaultFilterState)
      : false;

  useEffect(() => {
    fetch('/examples/blog.dbml')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => handleSchemaLoad(text))
      .catch((err: unknown) => {
        setLoadError(
          `Failed to load default schema: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }, [handleSchemaLoad]);

  if (visibleSchema === null) {
    return (
      <>
        <div
          style={{
            width: '100dvw',
            height: '100dvh',
            display: 'grid',
            placeItems: 'center',
            background: '#0f172a',
            color: '#94a3b8',
            fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          {loadError ? null : 'Loading…'}
        </div>
        <ErrorBanner message={loadError} />
      </>
    );
  }

  return (
    <div
      style={{
        width: '100dvw',
        height: '100dvh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Scene
        schema={visibleSchema}
        sourceSchema={schema ?? undefined}
        fieldDetailMode={filterState?.fieldDetailMode ?? 'full'}
        showTableGroupBoundaries={filterState?.showTableGroupBoundaries ?? true}
      />
      <div
        style={{
          position: 'fixed',
          left: '1rem',
          bottom: '2.5rem',
          display: 'flex',
          gap: '0.75rem',
          zIndex: 40,
        }}
      >
        <LoadFileButton onLoad={handleSchemaLoad} onHandleChange={setFileHandle} />
        <button
          type="button"
          disabled={fileHandle === null}
          aria-label="Reload current file"
          title={
            fileHandle === null
              ? 'Reload is available only for files opened with persistent file access'
              : 'Reload current file'
          }
          onClick={() => {
            void handleReloadFile();
          }}
          style={{
            backgroundColor: fileHandle !== null ? '#1C3552' : '#0f1f32',
            color: fileHandle !== null ? '#ffffff' : '#4a6a8a',
            fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: fileHandle !== null ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            if (fileHandle !== null) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#274565';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              fileHandle !== null ? '#1C3552' : '#0f1f32';
          }}
        >
          ↺ Reload
        </button>
        {filterState !== null && (
          <ViewFiltersButton
            isActive={hasActiveFilters}
            onClick={() => setIsViewFiltersOpen(true)}
          />
        )}
      </div>
      {schema !== null && filterState !== null && (
        <ViewFiltersDialog
          isOpen={isViewFiltersOpen}
          filterState={filterState}
          setFilterState={setFilterState}
          tables={schema.tables}
          tableGroups={schema.tableGroups}
          onClose={() => setIsViewFiltersOpen(false)}
        />
      )}
      <ErrorBanner message={loadError} />
    </div>
  );
}
