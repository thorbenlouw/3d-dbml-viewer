import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectNotesCard from '@/renderer/ProjectNotesCard';

const BASIC_NOTE = `# Project Overview\n\nThis project tracks **sales** data.`;

describe('ProjectNotesCard', () => {
  it('renders the project name in the header', () => {
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );
    expect(screen.getByText('MyProject')).toBeInTheDocument();
    unmount();
  });

  it('renders with data-testid project-notes-card', () => {
    const { container, unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );
    expect(container.querySelector('[data-testid="project-notes-card"]')).not.toBeNull();
    unmount();
  });

  it('shows the notes body by default (expanded)', () => {
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );
    expect(screen.getByTestId('project-notes-body')).toBeInTheDocument();
    unmount();
  });

  it('renders markdown content in the body', () => {
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );
    // react-markdown renders the heading as text
    expect(screen.getByText('Project Overview')).toBeInTheDocument();
    unmount();
  });

  it('hides the notes body when minimized', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );

    const toggleBtn = screen.getByTestId('project-notes-toggle');
    await user.click(toggleBtn);

    expect(screen.queryByTestId('project-notes-body')).toBeNull();
    unmount();
  });

  it('restores the notes body after unminimize', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );

    const toggleBtn = screen.getByTestId('project-notes-toggle');
    await user.click(toggleBtn); // minimize
    await user.click(toggleBtn); // expand

    expect(screen.getByTestId('project-notes-body')).toBeInTheDocument();
    unmount();
  });

  it('toggle button has aria-expanded=true when expanded', () => {
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );
    const btn = screen.getByTestId('project-notes-toggle');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    unmount();
  });

  it('toggle button has aria-expanded=false when minimized', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );

    await user.click(screen.getByTestId('project-notes-toggle'));
    expect(screen.getByTestId('project-notes-toggle')).toHaveAttribute('aria-expanded', 'false');
    unmount();
  });

  it('sanitizes unsafe HTML — script tags are not executed', () => {
    const unsafeNote = '<script>window.__xss = true;</script>\n\nSafe paragraph.';
    render(<ProjectNotesCard projectName="Unsafe" projectNote={unsafeNote} />);
    expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
    expect(screen.getByText('Safe paragraph.')).toBeInTheDocument();
    cleanup();
  });

  it('sanitizes javascript: href links', () => {
    const unsafeNote = '[Click me](javascript:alert(1))';
    const { container, unmount } = render(
      <ProjectNotesCard projectName="Unsafe" projectNote={unsafeNote} />,
    );
    const links = container.querySelectorAll('a');
    for (const link of links) {
      expect(link.href).not.toContain('javascript:');
    }
    unmount();
  });

  it('renders GFM table rows from markdown table syntax', () => {
    const tableNote = `| Column | Type |\n| --- | --- |\n| id | integer |\n| name | varchar |`;
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={tableNote} />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('varchar')).toBeInTheDocument();
    unmount();
  });

  it('renders the Project Notes label above the markdown', () => {
    const { unmount } = render(
      <ProjectNotesCard projectName="MyProject" projectNote={BASIC_NOTE} />,
    );
    expect(screen.getByText('Project Notes')).toBeInTheDocument();
    unmount();
  });
});
