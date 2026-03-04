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
  tableGroup?: string;
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

export interface SimulationNode extends LayoutNode {
  fx: number | null;
  fy: number | null;
  fz: number | null;
  isPinned: boolean;
  // d3-force-3d internal fields (added at runtime, not set by us)
  vx?: number;
  vy?: number;
  vz?: number;
  index?: number;
}

export interface TableCardNode extends SimulationNode {
  table: ParsedTable;
}

export interface HoverContext {
  tableId: string;
  tableName: string;
  tableGroup?: string;
  columnName?: string;
  note?: string;
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
