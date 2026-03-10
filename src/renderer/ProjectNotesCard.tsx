import { useState, useMemo, type ReactElement } from 'react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import {
  PANEL_BG_COLOR,
  PANEL_BORDER_COLOR,
  PANEL_TEXT_COLOR,
  PANEL_ACCENT_COLOR,
} from './constants';

export interface ProjectNotesCardProps {
  projectName: string;
  projectNote: string;
}

// Casts avoid `as const` readonly/mutable mismatch with the Markdown plugin props
const REMARK_PLUGINS = [remarkGfm] as Parameters<typeof Markdown>[0]['remarkPlugins'];
const REHYPE_PLUGINS = [rehypeSanitize] as Parameters<typeof Markdown>[0]['rehypePlugins'];

export default function ProjectNotesCard({
  projectName,
  projectNote,
}: ProjectNotesCardProps): ReactElement {
  const [minimized, setMinimized] = useState(false);

  const markdownElement = useMemo(
    () => (
      <Markdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>{projectNote}</Markdown>
    ),
    [projectNote],
  );

  return (
    <aside
      aria-label="Project notes panel"
      data-testid="project-notes-card"
      style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        width: 'min(22rem, calc(100vw - 2rem))',
        maxHeight: minimized ? 'auto' : '60vh',
        background: PANEL_BG_COLOR,
        border: `1px solid ${PANEL_BORDER_COLOR}`,
        borderRadius: '0.75rem',
        color: PANEL_TEXT_COLOR,
        zIndex: 30,
        fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
        backdropFilter: 'blur(2px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        aria-expanded={!minimized}
        aria-label={minimized ? 'Expand project notes' : 'Minimize project notes'}
        data-testid="project-notes-toggle"
        onClick={() => setMinimized((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '0.65rem 1rem',
          cursor: 'pointer',
          textAlign: 'left',
          borderBottom: minimized ? 'none' : `1px solid ${PANEL_BORDER_COLOR}`,
        }}
      >
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: PANEL_ACCENT_COLOR,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {projectName}
        </span>
        <span
          aria-hidden="true"
          data-testid="project-notes-chevron"
          style={{
            fontSize: '0.75rem',
            color: PANEL_TEXT_COLOR,
            opacity: 0.7,
            flexShrink: 0,
            transform: minimized ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          ▼
        </span>
      </button>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div
          data-testid="project-notes-body"
          style={{
            overflowY: 'auto',
            padding: '0.75rem 1rem 1rem',
            fontSize: '0.8rem',
            lineHeight: 1.55,
          }}
        >
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              opacity: 0.55,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            Project Notes
          </p>
          <div
            style={{
              color: PANEL_TEXT_COLOR,
            }}
          >
            {markdownElement}
          </div>
        </div>
      )}
    </aside>
  );
}
