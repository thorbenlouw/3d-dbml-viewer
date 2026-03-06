import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import type { HoverContext, ParsedColumn, TableCardNode } from '@/types';
import {
  BADGE_BG_COLOR,
  BADGE_GAP,
  BADGE_HEIGHT,
  BADGE_TEXT_COLOR,
  BADGE_WIDTH,
  CARD_BODY_COLOR,
  CARD_COLUMN_GAP,
  CARD_EDGE_COLOR,
  CARD_HEADER_COLOR,
  CARD_HEADER_HEIGHT,
  CARD_HORIZONTAL_PADDING,
  CARD_ROW_EVEN_COLOR,
  CARD_ROW_ODD_COLOR,
  CARD_ROW_HEIGHT,
  CARD_VERTICAL_PADDING,
  COLUMN_HIGHLIGHT_COLOR,
  DISTANCE_FAR,
  DISTANCE_NEAR,
  NOTE_ICON_CHAR,
  NOTE_ICON_SIZE,
  NOTE_HIGHLIGHT_COLOR,
  OPACITY_FAR,
  OPACITY_NEAR,
  SCENE_FONT_BOLD,
  SCENE_FONT_REGULAR,
  TEXT_BADGE_SIZE,
  TEXT_COLOR,
  TEXT_HEADER_SIZE,
  TEXT_ROW_SIZE,
  TITLE_SCALE_MAX,
} from './constants';
import { estimateTableCardDimensions } from './tableCardMetrics';

interface DragHandlers {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}

interface TableCardProps {
  node: TableCardNode;
  highlightedColumn?: string | '__table__';
  onTableHoverChange?: (value: HoverContext | null) => void;
  onColumnHoverChange?: (value: HoverContext | null) => void;
  dragHandlers?: DragHandlers;
  onFlyTo?: (tableId: string) => void;
}

interface FieldBadge {
  label: string;
  active: boolean;
}

const HIGHLIGHT_TEXT_COLOR = '#1f2937';

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  if (maxChars <= 1) return value.slice(0, maxChars);
  return `${value.slice(0, maxChars - 1)}…`;
}

function getBadges(column: ParsedColumn): FieldBadge[] {
  return [
    { label: 'PK', active: column.isPrimaryKey },
    { label: 'FK', active: column.isForeignKey },
    { label: 'NN', active: column.isNotNull },
    { label: 'UQ', active: column.isUnique },
  ];
}

function toTableHoverContext(node: TableCardNode): HoverContext {
  return {
    tableId: node.id,
    tableName: node.table.name,
    tableGroup: node.table.tableGroup,
    note: node.table.note,
  };
}

function toColumnHoverContext(node: TableCardNode, column: ParsedColumn): HoverContext {
  return {
    tableId: node.id,
    tableName: node.table.name,
    tableGroup: node.table.tableGroup,
    columnName: column.name,
    note: column.note ?? node.table.note,
  };
}

export default function TableCard({
  node,
  highlightedColumn,
  onTableHoverChange,
  onColumnHoverChange,
  dragHandlers,
  onFlyTo,
}: TableCardProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const headerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const bodyMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const dragHitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const headerHitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const rowHitMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const worldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const titleScaleGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const dimensions = useMemo(() => estimateTableCardDimensions(node.table), [node.table]);

  const headerY = dimensions.height / 2 - CARD_HEADER_HEIGHT / 2;
  const bodyHeight = dimensions.height - CARD_HEADER_HEIGHT;
  const bodyY = -dimensions.height / 2 + bodyHeight / 2;
  const rowSliceWidth = dimensions.width - CARD_HORIZONTAL_PADDING * 1.2;
  const rowSliceDepth = dimensions.depth * 0.55;

  const cardGeometry = useMemo(
    () => new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth),
    [dimensions.width, dimensions.height, dimensions.depth],
  );
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(cardGeometry), [cardGeometry]);

  useEffect(() => {
    if (dragHitMaterialRef.current) dragHitMaterialRef.current.depthWrite = false;
    if (headerHitMaterialRef.current) headerHitMaterialRef.current.depthWrite = false;
    for (const material of rowHitMaterialRefs.current) {
      if (material) material.depthWrite = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      edgesGeometry.dispose();
      cardGeometry.dispose();
    };
  }, [cardGeometry, edgesGeometry]);

  useFrame(() => {
    if (!groupRef.current || !headerMaterialRef.current || !bodyMaterialRef.current) return;

    groupRef.current.quaternion.copy(camera.quaternion);

    worldPositionRef.current.set(node.x, node.y, node.z);
    const dist = camera.position.distanceTo(worldPositionRef.current);
    const t = Math.max(0, Math.min(1, (DISTANCE_FAR - dist) / (DISTANCE_FAR - DISTANCE_NEAR)));
    const opacity = OPACITY_FAR + t * (OPACITY_NEAR - OPACITY_FAR);
    headerMaterialRef.current.opacity = opacity;
    bodyMaterialRef.current.opacity = opacity;

    if (titleScaleGroupRef.current) {
      const titleT = Math.max(
        0,
        Math.min(1, (dist - DISTANCE_NEAR) / (DISTANCE_FAR - DISTANCE_NEAR)),
      );
      const titleScale = 1 + titleT * (TITLE_SCALE_MAX - 1);
      titleScaleGroupRef.current.scale.setScalar(titleScale);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[node.x, node.y, node.z]}
      onDoubleClick={dragHandlers?.onDoubleClick}
    >
      <mesh position={[0, bodyY, 0]}>
        <boxGeometry args={[dimensions.width, bodyHeight, dimensions.depth]} />
        <meshBasicMaterial
          ref={bodyMaterialRef}
          color={CARD_BODY_COLOR}
          transparent
          opacity={OPACITY_FAR}
        />
      </mesh>

      <mesh position={[0, headerY, 0.001]}>
        <boxGeometry args={[dimensions.width, CARD_HEADER_HEIGHT, dimensions.depth]} />
        <meshBasicMaterial
          ref={headerMaterialRef}
          color={highlightedColumn === '__table__' ? COLUMN_HIGHLIGHT_COLOR : CARD_HEADER_COLOR}
          transparent
          opacity={OPACITY_FAR}
        />
      </mesh>

      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={CARD_EDGE_COLOR} />
      </lineSegments>

      {/* Full-card transparent hit mesh for drag events */}
      {dragHandlers && (
        <mesh
          position={[0, 0, dimensions.depth / 2 + 0.005]}
          onPointerDown={dragHandlers.onPointerDown}
          onPointerMove={dragHandlers.onPointerMove}
          onPointerUp={dragHandlers.onPointerUp}
          onPointerEnter={dragHandlers.onPointerEnter}
          onPointerLeave={dragHandlers.onPointerLeave}
        >
          <boxGeometry args={[dimensions.width, dimensions.height, 0.01]} />
          <meshBasicMaterial ref={dragHitMaterialRef} transparent opacity={0} />
        </mesh>
      )}

      {!dragHandlers && (
        <mesh
          position={[0, headerY, dimensions.depth / 2 + 0.014]}
          onPointerEnter={(event) => {
            event.stopPropagation();
            onTableHoverChange?.(toTableHoverContext(node));
          }}
          onPointerLeave={(event) => {
            event.stopPropagation();
            onTableHoverChange?.(null);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onFlyTo?.(node.id);
          }}
        >
          <boxGeometry args={[dimensions.width, CARD_HEADER_HEIGHT, 0.015]} />
          <meshBasicMaterial ref={headerHitMaterialRef} transparent opacity={0} />
        </mesh>
      )}

      <group ref={titleScaleGroupRef} position={[0, headerY, dimensions.depth / 2 + 0.012]}>
        <Text
          font={SCENE_FONT_REGULAR}
          color={highlightedColumn === '__table__' ? HIGHLIGHT_TEXT_COLOR : TEXT_COLOR}
          fontSize={TEXT_HEADER_SIZE}
          anchorX="center"
          anchorY="middle"
          maxWidth={dimensions.width - CARD_HORIZONTAL_PADDING * 2}
        >
          {truncate(node.table.name, 32)}
        </Text>
      </group>

      {node.table.note && (
        <Text
          font={SCENE_FONT_REGULAR}
          color={NOTE_HIGHLIGHT_COLOR}
          fontSize={NOTE_ICON_SIZE}
          anchorX="center"
          anchorY="middle"
          position={[
            dimensions.width / 2 - CARD_HORIZONTAL_PADDING,
            headerY + CARD_HEADER_HEIGHT * 0.28,
            dimensions.depth / 2 + 0.02,
          ]}
        >
          {NOTE_ICON_CHAR}
        </Text>
      )}

      {node.table.columns.map((column, index) => {
        const rowTop =
          dimensions.height / 2 -
          CARD_HEADER_HEIGHT -
          CARD_VERTICAL_PADDING -
          index * CARD_ROW_HEIGHT;
        const rowY = rowTop - CARD_ROW_HEIGHT / 2;
        const leftX = -dimensions.width / 2 + CARD_HORIZONTAL_PADDING;
        const badgeGroupRightX = dimensions.width / 2 - CARD_HORIZONTAL_PADDING;
        const badges = getBadges(column).filter((badge) => badge.active);
        const isHighlighted = highlightedColumn === column.name;

        return (
          <group key={`${node.id}-${column.name}-${index}`}>
            {!dragHandlers && (
              <mesh
                position={[0, rowY, dimensions.depth / 2 + 0.015]}
                onPointerEnter={(event) => {
                  event.stopPropagation();
                  onColumnHoverChange?.(toColumnHoverContext(node, column));
                }}
                onPointerLeave={(event) => {
                  event.stopPropagation();
                  onColumnHoverChange?.(null);
                }}
              >
                <boxGeometry args={[rowSliceWidth, CARD_ROW_HEIGHT * 0.86, 0.015]} />
                <meshBasicMaterial
                  ref={(material) => {
                    rowHitMaterialRefs.current[index] = material;
                  }}
                  transparent
                  opacity={0}
                />
              </mesh>
            )}

            <mesh position={[0, rowY, dimensions.depth / 2 - rowSliceDepth / 2 + 0.001]}>
              <boxGeometry args={[rowSliceWidth, CARD_ROW_HEIGHT * 0.86, rowSliceDepth]} />
              <meshBasicMaterial
                color={
                  isHighlighted
                    ? COLUMN_HIGHLIGHT_COLOR
                    : index % 2 === 0
                      ? CARD_ROW_EVEN_COLOR
                      : CARD_ROW_ODD_COLOR
                }
              />
            </mesh>

            <Text
              font={column.isPrimaryKey ? SCENE_FONT_BOLD : SCENE_FONT_REGULAR}
              color={isHighlighted ? HIGHLIGHT_TEXT_COLOR : TEXT_COLOR}
              fontSize={TEXT_ROW_SIZE}
              position={[leftX, rowY, dimensions.depth / 2 + 0.02]}
              anchorX="left"
              anchorY="middle"
              maxWidth={dimensions.width * 0.42}
            >
              {truncate(column.name, 24)}
            </Text>

            <Text
              font={SCENE_FONT_REGULAR}
              color={isHighlighted ? HIGHLIGHT_TEXT_COLOR : TEXT_COLOR}
              fontSize={TEXT_ROW_SIZE}
              position={[
                leftX + dimensions.width * 0.42 + CARD_COLUMN_GAP,
                rowY,
                dimensions.depth / 2 + 0.02,
              ]}
              anchorX="left"
              anchorY="middle"
              maxWidth={dimensions.width * 0.27}
            >
              {truncate(column.type, 20)}
            </Text>

            {badges.map((badge, badgeIndex) => {
              const offsetFromRight = badgeIndex * (BADGE_WIDTH + BADGE_GAP);
              const badgeX = badgeGroupRightX - BADGE_WIDTH / 2 - offsetFromRight;
              return (
                <group
                  key={`${node.id}-${column.name}-${badge.label}`}
                  position={[badgeX, rowY, dimensions.depth / 2 + 0.012]}
                >
                  <mesh>
                    <boxGeometry args={[BADGE_WIDTH, BADGE_HEIGHT, 0.01]} />
                    <meshBasicMaterial color={BADGE_BG_COLOR} transparent opacity={0.95} />
                  </mesh>
                  <Text
                    font={SCENE_FONT_BOLD}
                    color={BADGE_TEXT_COLOR}
                    fontSize={TEXT_BADGE_SIZE}
                    anchorX="center"
                    anchorY="middle"
                    position={[0, 0, 0.006]}
                  >
                    {badge.label}
                  </Text>
                </group>
              );
            })}

            {column.note && (
              <Text
                font={SCENE_FONT_REGULAR}
                color={NOTE_HIGHLIGHT_COLOR}
                fontSize={NOTE_ICON_SIZE}
                anchorX="center"
                anchorY="middle"
                position={[
                  badgeGroupRightX -
                    (badges.length > 0 ? badges.length * (BADGE_WIDTH + BADGE_GAP) + 0.1 : 0),
                  rowY,
                  dimensions.depth / 2 + 0.02,
                ]}
              >
                {NOTE_ICON_CHAR}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}
