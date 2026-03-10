import type { ReactElement } from 'react';

interface ResetViewButtonProps {
  onClick: () => void;
}

export default function ResetViewButton({ onClick }: ResetViewButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Reset camera to overview"
      style={{
        position: 'fixed',
        bottom: '2.5rem',
        right: '1rem',
        backgroundColor: '#0288D1',
        color: '#ffffff',
        fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0277BD';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0288D1';
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid #0288D1';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      Reset View
    </button>
  );
}
