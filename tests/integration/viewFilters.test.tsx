import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '@/App';
import { buildReferencedFieldLookup, getVisibleColumns } from '@/renderer/fieldDetailMode';
import type { ParsedSchema } from '@/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basicFixture = readFileSync(resolve(__dirname, '../fixtures/view-filters-basic.dbml'), 'utf-8');
const largeFixture = readFileSync(resolve(__dirname, '../fixtures/view-filters-large.dbml'), 'utf-8');

const originalFileReader = window.FileReader;

vi.mock('@/renderer/Scene', () => ({
  default: function SceneMock(props: {
    schema: ParsedSchema;
    sourceSchema?: ParsedSchema;
    fieldDetailMode?: 'full' | 'ref-fields-only' | 'table-only';
  }): ReactElement {
    const sourceSchema = props.sourceSchema ?? props.schema;
    const referencedFieldLookup = buildReferencedFieldLookup(sourceSchema);

    return (
      <div data-testid="scene-summary">
        <div data-testid="scene-mode">{props.fieldDetailMode ?? 'full'}</div>
        <div data-testid="scene-table-count">{props.schema.tables.length}</div>
        <div data-testid="scene-ref-count">{props.schema.refs.length}</div>
        <ul data-testid="scene-ref-list">
          {props.schema.refs.map((ref) => (
            <li key={ref.id}>{`${ref.sourceId}->${ref.targetId}`}</li>
          ))}
        </ul>
        {props.schema.tables.map((table) => (
          <section key={table.id} data-testid={`scene-table-${table.id}`}>
            <h2>{table.name}</h2>
            <ul>
              {getVisibleColumns(
                table,
                props.fieldDetailMode ?? 'full',
                referencedFieldLookup.get(table.id),
              ).map((column) => (
                <li key={column.name}>{column.name}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  },
}));

vi.mock('@/ui/ErrorBanner', () => ({
  default: function ErrorBannerMock(): ReactElement | null {
    return null;
  },
}));

function stubFileReader(result: string): void {
  class FileReaderMock {
    onload: ((e: ProgressEvent<FileReader>) => void) | null = null;

    readAsText(): void {
      const event = { target: { result } } as unknown as ProgressEvent<FileReader>;
      this.onload?.(event);
    }
  }

  Object.defineProperty(window, 'FileReader', {
    configurable: true,
    writable: true,
    value: FileReaderMock,
  });
}

async function waitForInitialSchema(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('scene-table-count')).toHaveTextContent('3');
    expect(screen.getByTestId('scene-ref-count')).toHaveTextContent('3');
  });
}

function getLoadInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Load file input not found');
  }
  return input;
}

function selectDbmlFile(input: HTMLInputElement, fileName: string): void {
  const file = new File(['unused'], fileName, { type: 'text/plain' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

describe('view filters integration', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(basicFixture),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'FileReader', {
      configurable: true,
      writable: true,
      value: originalFileReader,
    });
    cleanup();
  });

  it('shows only table headers in table-only mode and only referenced fields in ref-fields-only mode', async () => {
    render(<App />);

    await waitForInitialSchema();

    const usersTable = screen.getByTestId('scene-table-users');
    expect(within(usersTable).getByText('email')).toBeInTheDocument();
    expect(within(usersTable).getByText('display_name')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));
    fireEvent.click(screen.getByLabelText('Table Only'));

    await waitFor(() => {
      expect(screen.getByTestId('scene-mode')).toHaveTextContent('table-only');
      expect(within(screen.getByTestId('scene-table-users')).queryByText('email')).not.toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-posts')).queryByText('title')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Ref Fields Only'));

    await waitFor(() => {
      expect(screen.getByTestId('scene-mode')).toHaveTextContent('ref-fields-only');
      expect(within(screen.getByTestId('scene-table-users')).getByText('id')).toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-users')).queryByText('email')).not.toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-posts')).getByText('id')).toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-posts')).getByText('author_id')).toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-posts')).queryByText('title')).not.toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-comments')).getByText('post_id')).toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-comments')).getByText('commenter_id')).toBeInTheDocument();
      expect(within(screen.getByTestId('scene-table-comments')).queryByText('body')).not.toBeInTheDocument();
    });
  });

  it('removes a hidden table and only the refs attached to it', async () => {
    render(<App />);

    await waitForInitialSchema();

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /posts/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('scene-table-posts')).not.toBeInTheDocument();
      expect(screen.getByTestId('scene-table-count')).toHaveTextContent('2');
      expect(screen.getByTestId('scene-ref-count')).toHaveTextContent('1');
      expect(screen.queryByText('posts->users')).not.toBeInTheDocument();
      expect(screen.queryByText('comments->posts')).not.toBeInTheDocument();
      expect(screen.getByText('comments->users')).toBeInTheDocument();
    });
  });

  it('unselects and reselects all tables from the dialog controls', async () => {
    render(<App />);

    await waitForInitialSchema();

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Unselect All' }));

    await waitFor(() => {
      expect(screen.getByTestId('scene-table-count')).toHaveTextContent('0');
      expect(screen.getByTestId('scene-ref-count')).toHaveTextContent('0');
      expect(screen.queryByTestId('scene-table-users')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select All' }));

    await waitFor(() => {
      expect(screen.getByTestId('scene-table-count')).toHaveTextContent('3');
      expect(screen.getByTestId('scene-ref-count')).toHaveTextContent('3');
      expect(screen.getByTestId('scene-table-users')).toBeInTheDocument();
      expect(screen.getByTestId('scene-table-posts')).toBeInTheDocument();
      expect(screen.getByTestId('scene-table-comments')).toBeInTheDocument();
    });
  });

  it('resets filter state to the new schema defaults after loading a second file', async () => {
    const { container } = render(<App />);

    await waitForInitialSchema();

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));
    fireEvent.click(screen.getByLabelText('Table Only'));
    fireEvent.click(screen.getByRole('checkbox', { name: /posts/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scene-mode')).toHaveTextContent('table-only');
      expect(screen.getByTestId('scene-table-count')).toHaveTextContent('2');
    });

    stubFileReader(largeFixture);
    selectDbmlFile(getLoadInput(container), 'view-filters-large.dbml');

    await waitFor(() => {
      expect(screen.getByTestId('scene-table-count')).toHaveTextContent('31');
      expect(screen.getByTestId('scene-mode')).toHaveTextContent('table-only');
    });

    fireEvent.click(screen.getByRole('button', { name: /open view filters/i }));

    expect(screen.getByLabelText('Table Only')).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /table_01/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /table_31/i })).toBeChecked();
  });
});
