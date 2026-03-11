import { useRef, type ReactElement, type ChangeEvent, type CSSProperties } from 'react';

interface LoadFileButtonProps {
  onLoad: (text: string) => void;
  onHandleChange: (handle: FileSystemFileHandle | null) => void;
}

const BUTTON_STYLE: CSSProperties = {
  backgroundColor: '#1C3552',
  color: '#ffffff',
  fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
};

export default function LoadFileButton({
  onLoad,
  onHandleChange,
}: LoadFileButtonProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleButtonClick(): Promise<void> {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ accept: { 'text/plain': ['.dbml'] } }],
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        onLoad(text);
        onHandleChange(handle);
      } catch (err) {
        // User cancelled the picker — AbortError is expected
        if (err instanceof DOMException && err.name === 'AbortError') return;
        throw err;
      }
    } else {
      inputRef.current?.click();
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        onLoad(text);
        onHandleChange(null);
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
        onClick={() => {
          void handleButtonClick();
        }}
        aria-label="Load a DBML file from disk"
        style={BUTTON_STYLE}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#274565';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1C3552';
        }}
      >
        Load file…
      </button>
    </>
  );
}
