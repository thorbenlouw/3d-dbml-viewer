export interface ParsedColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  note?: string;
}

export interface ParsedTable {
  id: string;
  name: string;
  columns: ParsedColumn[];
  note?: string;
}

export interface ParsedRef {
  id: string;
  sourceId: string;
  targetId: string;
  sourceFieldNames: string[];
  targetFieldNames: string[];
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

export interface TableCardNode extends LayoutNode {
  table: ParsedTable;
}

export interface ActiveNote {
  tableId: string;
  columnName?: string;
  noteText: string;
  ownerLabel: string;
  anchorWorldPosition: [number, number, number];
  cardPosition: [number, number, number];
}

export interface RelationshipLinkModel {
  id: string;
  sourceId: string;
  targetId: string;
  sourceFieldNames: string[];
  targetFieldNames: string[];
  linkIndex: number;
  parallelCount: number;
}
