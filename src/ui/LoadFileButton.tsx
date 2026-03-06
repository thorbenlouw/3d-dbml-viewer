import { useRef, type ReactElement, type ChangeEvent } from 'react';

interface LoadFileButtonProps {
  onLoad: (text: string) => void;
}

export default function LoadFileButton({ onLoad }: LoadFileButtonProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleButtonClick(): void {
    inputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        onLoad(text);
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".dbml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        aria-label="Load a DBML file from disk"
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '15.5rem',
          backgroundColor: '#334155',
          color: '#ffffff',
          fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          zIndex: 40,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#475569';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#334155';
        }}
      >
        Load file…
      </button>
    </>
  );
}
