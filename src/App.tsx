import { useState, useEffect, useCallback } from 'react';
import { parseDatabaseSchema, ParseError } from '@/parser';
import Scene from '@/renderer/Scene';
import ErrorBanner from '@/ui/ErrorBanner';
import type { ParsedSchema } from '@/types';
import type { ReactElement } from 'react';

export default function App(): ReactElement {
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSchemaLoad = useCallback((text: string): void => {
    try {
      const parsed = parseDatabaseSchema(text);
      setSchema(parsed);
      setLoadError(null);
    } catch (err) {
      if (err instanceof ParseError) {
        setLoadError(err.message);
      } else {
        setLoadError('An unexpected error occurred');
      }
    }
  }, []);

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

  if (schema === null) {
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
      <Scene schema={schema} onLoadFile={handleSchemaLoad} />
      <ErrorBanner message={loadError} />
    </div>
  );
}
