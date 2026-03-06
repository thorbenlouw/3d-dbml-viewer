import type { CSSProperties, ReactElement } from 'react';
import type { ReferenceItem } from '@/types';
import type { ReferencesForContext } from './hoverContext';
import type { HoverContext } from '@/types';
import {
  PANEL_ACCENT_COLOR,
  PANEL_BG_COLOR,
  PANEL_BORDER_COLOR,
  PANEL_TEXT_COLOR,
} from './constants';

export interface NavigationPanelProps {
  hoverContext: HoverContext | null;
  references: ReferencesForContext | null;
  projectName?: string;
}

const SECTION_PANEL_STYLE: CSSProperties = {
  background: 'rgba(0,0,0,0.25)',
  borderRadius: '0.375rem',
  padding: '0.4rem 0.6rem',
};

const LABEL_STYLE: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.2rem',
};

const VALUE_STYLE: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 400,
};

const ATTRIBUTE_BADGE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.3rem',
  fontSize: '0.8rem',
  fontWeight: 400,
  marginBottom: '0.2rem',
};

interface AttributeEntry {
  icon: string;
  label: string;
}

const ALL_ATTRIBUTES: Array<{
  icon: string;
  label: string;
  key: keyof NonNullable<HoverContext['columnAttributes']>;
}> = [
  { icon: '🔑', label: 'Primary Key', key: 'isPrimaryKey' },
  { icon: '🔗', label: 'Foreign Key', key: 'isForeignKey' },
  { icon: '❗', label: 'Not Null', key: 'isNotNull' },
  { icon: '💎', label: 'Unique', key: 'isUnique' },
];

function getHoverTargetLabel(hoverContext: HoverContext | null): string {
  if (!hoverContext) return 'None';
  if (hoverContext.columnName) {
    return `${hoverContext.tableName}.${hoverContext.columnName}`;
  }
  return hoverContext.tableName;
}

function ReferenceList({ items }: { items: ReferenceItem[] }): ReactElement {
  if (items.length === 0) {
    return <p style={VALUE_STYLE}>No outgoing references.</p>;
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.2rem' }}>
      {items.map((item) => (
        <li
          key={item.label}
          style={{
            ...VALUE_STYLE,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>{item.label}</span>
          {item.cardinality && (
            <span style={{ opacity: 0.65, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {item.cardinality}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function NavigationPanel({
  hoverContext,
  references,
  projectName,
}: NavigationPanelProps): ReactElement {
  const groupLabel = hoverContext?.tableGroup ?? '-';
  const noteValue = hoverContext?.note?.trim() || '-';

  const attrs = hoverContext?.columnAttributes;
  const activeAttrs: AttributeEntry[] = attrs ? ALL_ATTRIBUTES.filter((a) => attrs[a.key]) : [];

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
        {projectName ?? 'Details'}
      </h2>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={LABEL_STYLE}>Hover target</p>
        <div style={SECTION_PANEL_STYLE}>
          <p data-testid="navigation-target-value" style={VALUE_STYLE}>
            {getHoverTargetLabel(hoverContext)}
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={LABEL_STYLE}>Table</p>
        <div style={SECTION_PANEL_STYLE}>
          <p style={VALUE_STYLE}>{hoverContext?.tableName ?? 'None'}</p>
        </div>
      </section>

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={LABEL_STYLE}>Table group</p>
        <div style={SECTION_PANEL_STYLE}>
          <p style={VALUE_STYLE}>{groupLabel}</p>
        </div>
      </section>

      {activeAttrs.length > 0 && (
        <section style={{ marginBottom: '0.85rem' }}>
          <p style={LABEL_STYLE}>Attributes</p>
          <div style={SECTION_PANEL_STYLE}>
            {activeAttrs.map((attr) => (
              <div key={attr.label} style={ATTRIBUTE_BADGE_STYLE}>
                <span>{attr.icon}</span>
                <span>{attr.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '0.85rem' }}>
        <p style={LABEL_STYLE}>{references?.title ?? 'Referenced tables'}</p>
        <div style={SECTION_PANEL_STYLE}>
          <ReferenceList items={references?.items ?? []} />
        </div>
      </section>

      <section>
        <p style={LABEL_STYLE}>Note</p>
        <div style={SECTION_PANEL_STYLE}>
          <p
            style={{
              ...VALUE_STYLE,
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {noteValue}
          </p>
        </div>
      </section>
    </aside>
  );
}
