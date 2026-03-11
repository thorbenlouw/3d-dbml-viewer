import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LoadFileButton from '@/ui/LoadFileButton';

afterEach(() => {
  cleanup();
});

const originalFileReader = window.FileReader;

function stubFileReader(result: string): void {
  class FileReaderMock {
    onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
    readAsText(): void {
      const event = { target: { result } } as unknown as ProgressEvent<FileReader>;
      this.onload?.(event);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).FileReader = FileReaderMock;
}

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).FileReader = originalFileReader;
});

describe('LoadFileButton', () => {
  it('renders a button labelled "Load file…"', () => {
    render(<LoadFileButton onLoad={vi.fn()} onHandleChange={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /load a dbml file from disk/i });
    expect(btn.textContent).toBe('Load file…');
  });

  it('calls onLoad with the file text when a file is selected', () => {
    const onLoad = vi.fn();
    stubFileReader('Table foo { id int [pk] }');

    const { container } = render(<LoadFileButton onLoad={onLoad} onHandleChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Table foo { id int [pk] }'], 'schema.dbml', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(onLoad).toHaveBeenCalledWith('Table foo { id int [pk] }');
  });

  it('resets input value to "" after calling onLoad', () => {
    const onLoad = vi.fn();
    stubFileReader('content');

    const { container } = render(<LoadFileButton onLoad={onLoad} onHandleChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'schema.dbml', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(input.value).toBe('');
  });
});
