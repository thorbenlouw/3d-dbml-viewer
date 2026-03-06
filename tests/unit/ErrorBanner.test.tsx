import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorBanner from '@/ui/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorBanner message={null} />);
    expect(container.firstChild).toBeNull();
    cleanup();
  });

  it('renders the message text when message is a string', () => {
    const { unmount } = render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    unmount();
  });

  it('renders data-testid="error-banner" when visible', () => {
    const { container } = render(<ErrorBanner message="Parse error" />);
    expect(container.querySelector('[data-testid="error-banner"]')).not.toBeNull();
  });
});
