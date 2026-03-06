import type { ReactElement } from 'react';

interface ErrorBannerProps {
  message: string | null;
}

export default function ErrorBanner({ message }: ErrorBannerProps): ReactElement | null {
  if (message === null) return null;

  return (
    <div
      data-testid="error-banner"
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
        fontSize: '0.875rem',
        padding: '0.75rem 1.25rem',
        borderRadius: '0.375rem',
        zIndex: 50,
        maxWidth: '40rem',
        width: 'max-content',
      }}
    >
      {message}
    </div>
  );
}
