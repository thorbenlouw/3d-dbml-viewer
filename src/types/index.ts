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
  headerColor?: string;
}

export interface ParsedRef {
  id: string;
  sourceId: string;
  targetId: string;
  sourceFieldNames: string[];
  targetFieldNames: string[];
  sourceRelation?: string;
  targetRelation?: string;
  color?: string;
}

export interface ParsedTableGroup {
  name: string;
  color?: string;
}

export interface ReferenceItem {
  label: string;
  cardinality?: string;
}

export interface ParsedSchema {
  tables: ParsedTable[];
  refs: ParsedRef[];
  projectName?: string;
  projectNote?: string;
  tableGroups?: ParsedTableGroup[];
}

export interface TableGroupDescriptor {
  id: string;
  name: string;
  tableIds: string[];
  // estimated half-extents in world units (before placement), including padding
  halfWidth: number;
  halfHeight: number;
  halfDepth: number;
}

export interface TableGroupBoundingBox {
  groupId: string;
  groupName: string;
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
  color?: string;
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
  columnAttributes?: {
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNotNull: boolean;
    isUnique: boolean;
  };
  referencedByFields?: string[];
  referencedByTables?: string[];
}

export interface RelationshipLinkModel {
  id: string;
  sourceId: string;
  targetId: string;
  sourceFieldNames: string[];
  targetFieldNames: string[];
  linkIndex: number;
  parallelCount: number;
  color?: string;
}

export type FieldDetailMode = 'full' | 'ref-fields-only' | 'table-only';

export interface FilterState {
  fieldDetailMode: FieldDetailMode;
  visibleTableIds: Set<string>;
  visibleTableGroupIds: Set<string>; // '__ungrouped__' sentinel for tables with no tableGroup
  showTableGroupBoundaries: boolean; // default true when schema has TableGroups
}
