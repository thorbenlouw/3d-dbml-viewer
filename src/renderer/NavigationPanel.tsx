import type { ReactElement } from 'react';
import type { HoverContext } from '@/types';
import {
  PANEL_ACCENT_COLOR,
  PANEL_BG_COLOR,
  PANEL_BORDER_COLOR,
  PANEL_TEXT_COLOR,
} from './constants';

export interface NavigationPanelProps {
  hoverContext: HoverContext | null;
  referencedTables: string[];
}

const EMPTY_NOTE = 'Hover a table or column to inspect notes and relationships.';

function getHoverTargetLabel(hoverContext: HoverContext | null): string {
  if (!hoverContext) return 'None';
  if (hoverContext.columnName) {
    return `${hoverContext.tableName}.${hoverContext.columnName}`;
  }
  return hoverContext.tableName;
}

export default function NavigationPanel({
  hoverContext,
  referencedTables,
}: NavigationPanelProps): ReactElement {
  const groupLabel = hoverContext?.tableGroup ?? 'Ungrouped';
  const noteValue = hoverContext?.note?.trim() || EMPTY_NOTE;

  return (
    <aside
      aria-label="Hover navigation panel"
      data-testid="navigation-panel"
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        bottom: '4.25rem',
        width: 'min(24rem, calc(100vw - 2rem))',
        background: PANEL_BG_COLOR,
        border: `1px solid ${PANEL_BORDER_COLOR}`,
        borderRadius: '0.75rem',
        color: PANEL_TEXT_COLOR,
        padding: '1rem',
        overflowY: 'auto',
        zIndex: 30,
        fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
        backdropFilter: 'blur(2px)',
      }}
    >
      <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: PANEL_ACCENT_COLOR }}>
        Navigation
      </h2>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem' }}>Hover target</p>
        <p data-testid="navigation-target-value" style={{ fontWeight: 600, lineHeight: 1.4 }}>
          {getHoverTargetLabel(hoverContext)}
        </p>
      </section>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem' }}>Table</p>
        <p style={{ fontWeight: 500 }}>{hoverContext?.tableName ?? 'None'}</p>
      </section>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem' }}>Table group</p>
        <p style={{ fontWeight: 500 }}>{groupLabel}</p>
      </section>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.35rem' }}>
          Referenced tables
        </p>
        {referencedTables.length > 0 ? (
          <ul style={{ paddingLeft: '1rem', display: 'grid', gap: '0.2rem' }}>
            {referencedTables.map((tableName) => (
              <li key={tableName}>{tableName}</li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.85 }}>No outgoing references.</p>
        )}
      </section>

      <section>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.35rem' }}>Note</p>
        <p style={{ lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {noteValue}
        </p>
      </section>
    </aside>
  );
}
