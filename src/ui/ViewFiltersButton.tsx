import type { ReactElement } from 'react';

interface ViewFiltersButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export default function ViewFiltersButton({
  isActive,
  onClick,
}: ViewFiltersButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open view filters"
      style={{
        position: 'relative',
        backgroundColor: isActive ? '#15344F' : '#132238',
        color: '#ffffff',
        fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: isActive ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.3)',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      View Filters
      {isActive && (
        <span
          data-testid="view-filters-active-indicator"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '0.35rem',
            right: '0.35rem',
            width: '0.45rem',
            height: '0.45rem',
            borderRadius: '999px',
            background: '#38bdf8',
            boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.18)',
          }}
        />
      )}
    </button>
  );
}
