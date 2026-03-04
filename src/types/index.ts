export interface ParsedTable {
  id: string;
  name: string;
}

export interface ParsedRef {
  sourceId: string;
  targetId: string;
}

export interface ParsedSchema {
  tables: ParsedTable[];
  refs: ParsedRef[];
}

export interface LayoutNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
}
