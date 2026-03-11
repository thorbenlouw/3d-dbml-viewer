/**
 * Augment Window with File System Access API methods not yet in TypeScript's lib.dom.d.ts.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
 */

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}

interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}
