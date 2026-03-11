import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import type { FieldDetailMode, HoverContext, ParsedColumn, TableCardNode } from '@/types';
import {
  BADGE_BG_COLOR,
  BADGE_GAP,
  BADGE_HEIGHT,
  BADGE_TEXT_COLOR,
  BADGE_WIDTH,
  CARD_BODY_COLOR,
  CARD_COLUMN_GAP,
  CARD_EDGE_COLOR,
  CARD_HEADER_HEIGHT,
  CARD_HORIZONTAL_PADDING,
  CARD_ROW_EVEN_COLOR,
  CARD_ROW_ODD_COLOR,
  CARD_ROW_HEIGHT,
  CARD_VERTICAL_PADDING,
  COLUMN_HIGHLIGHT_COLOR,
  DISTANCE_FAR,
  DISTANCE_NEAR,
  NOTE_BADGE_TEXT_COLOR,
  NOTE_ICON_CHAR,
  OPACITY_FAR,
  OPACITY_NEAR,
  SCENE_FONT_BOLD,
  SCENE_FONT_REGULAR,
  TEXT_BADGE_SIZE,
  TEXT_COLOR,
  TEXT_HEADER_SIZE,
  TEXT_ROW_SIZE,
  STICKY_BORDER_COLOR,
  STICKY_BORDER_GLOW_OPACITY,
  TITLE_SCALE_MAX,
} from './constants';
import { resolveTableHeaderColor } from './colorUtils';
import { getVisibleColumns } from './fieldDetailMode';
import { estimateTableCardDimensions } from './tableCardMetrics';
import { SCENE_INTERACTION_ROLE, SCENE_ROLE_TABLE_CARD } from './interaction';

interface TableCardProps {
  node: TableCardNode;
  fieldDetailMode: FieldDetailMode;
  referencedFieldNames?: ReadonlySet<string>;
  isSticky?: boolean;
  highlightedColumn?: string | '__table__';
  onTableHoverChange?: (value: HoverContext | null) => void;
  onColumnHoverChange?: (value: HoverContext | null) => void;
  onHeaderDoubleClick?: (tableId: string) => void;
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
    { label: '🔑', active: column.isPrimaryKey },
    { label: '🔗', active: column.isForeignKey },
    { label: '❗', active: column.isNotNull },
    { label: '💎', active: column.isUnique },
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
    note: column.note,
    columnAttributes: {
      isPrimaryKey: column.isPrimaryKey,
      isForeignKey: column.isForeignKey,
      isNotNull: column.isNotNull,
      isUnique: column.isUnique,
    },
  };
}

export default function TableCard({
  node,
  fieldDetailMode,
  referencedFieldNames,
  isSticky = false,
  highlightedColumn,
  onTableHoverChange,
  onColumnHoverChange,
  onHeaderDoubleClick,
}: TableCardProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const headerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const bodyMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const tableHitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const headerHitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const worldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const titleScaleGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const visibleColumns = useMemo(
    () => getVisibleColumns(node.table, fieldDetailMode, referencedFieldNames),
    [fieldDetailMode, node.table, referencedFieldNames],
  );
  const dimensions = useMemo(
    () => estimateTableCardDimensions(node.table, visibleColumns),
    [node.table, visibleColumns],
  );
  const headerColor = useMemo(
    () => resolveTableHeaderColor(node.table.headerColor),
    [node.table.headerColor],
  );

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
    if (groupRef.current) {
      const userData = (groupRef.current.userData ??= {});
      userData[SCENE_INTERACTION_ROLE] = SCENE_ROLE_TABLE_CARD;
    }
    if (tableHitMaterialRef.current) tableHitMaterialRef.current.depthWrite = false;
    if (headerHitMaterialRef.current) headerHitMaterialRef.current.depthWrite = false;
  }, []);

  useEffect(() => {
    return () => {
      edgesGeometry.dispose();
      cardGeometry.dispose();
    };
  }, [cardGeometry, edgesGeometry]);

  useFrame(() => {
    if (!groupRef.current || !headerMaterialRef.current) return;

    groupRef.current.quaternion.copy(camera.quaternion);

    worldPositionRef.current.set(node.x, node.y, node.z);
    const dist = camera.position.distanceTo(worldPositionRef.current);
    const t = Math.max(0, Math.min(1, (DISTANCE_FAR - dist) / (DISTANCE_FAR - DISTANCE_NEAR)));
    const opacity = OPACITY_FAR + t * (OPACITY_NEAR - OPACITY_FAR);
    headerMaterialRef.current.opacity = opacity;
    if (bodyMaterialRef.current) {
      bodyMaterialRef.current.opacity = opacity;
    }

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
    <group ref={groupRef} position={[node.x, node.y, node.z]}>
      {bodyHeight > 0 && (
        <mesh position={[0, bodyY, 0]}>
          <boxGeometry args={[dimensions.width, bodyHeight, dimensions.depth]} />
          <meshBasicMaterial
            ref={bodyMaterialRef}
            color={CARD_BODY_COLOR}
            transparent
            opacity={OPACITY_FAR}
          />
        </mesh>
      )}

      <mesh position={[0, headerY, 0.001]}>
        <boxGeometry args={[dimensions.width, CARD_HEADER_HEIGHT, dimensions.depth]} />
        <meshBasicMaterial
          ref={headerMaterialRef}
          color={highlightedColumn === '__table__' ? COLUMN_HIGHLIGHT_COLOR : headerColor}
          transparent
          opacity={OPACITY_FAR}
        />
      </mesh>

      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={isSticky ? STICKY_BORDER_COLOR : CARD_EDGE_COLOR} />
      </lineSegments>
      {isSticky && (
        <lineSegments geometry={edgesGeometry} scale={[1.035, 1.035, 1.035]}>
          <lineBasicMaterial
            color={STICKY_BORDER_COLOR}
            transparent
            opacity={STICKY_BORDER_GLOW_OPACITY}
          />
        </lineSegments>
      )}

      <mesh
        position={[0, 0, dimensions.depth / 2 + 0.013]}
        onPointerEnter={(event) => {
          event.stopPropagation();
          onTableHoverChange?.(toTableHoverContext(node));
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onTableHoverChange?.(toTableHoverContext(node));
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onHeaderDoubleClick?.(node.id);
        }}
      >
        <boxGeometry args={[dimensions.width * 1.8, dimensions.height * 1.8, 0.012]} />
        <meshBasicMaterial ref={tableHitMaterialRef} transparent opacity={0} />
      </mesh>

      <mesh
        position={[0, headerY, dimensions.depth / 2 + 0.014]}
        onPointerEnter={(event) => {
          event.stopPropagation();
          onTableHoverChange?.(toTableHoverContext(node));
        }}
      >
        <boxGeometry args={[dimensions.width, CARD_HEADER_HEIGHT, 0.015]} />
        <meshBasicMaterial ref={headerHitMaterialRef} transparent opacity={0} />
      </mesh>

      <group
        ref={titleScaleGroupRef}
        position={[0, dimensions.height / 2 + 0.18, dimensions.depth / 2 + 0.01]}
      >
        <Text
          font={SCENE_FONT_REGULAR}
          color={highlightedColumn === '__table__' ? COLUMN_HIGHLIGHT_COLOR : TEXT_COLOR}
          fontSize={TEXT_HEADER_SIZE * 2}
          anchorX="center"
          anchorY="bottom"
          maxWidth={dimensions.width - CARD_HORIZONTAL_PADDING * 2}
        >
          {truncate(node.table.name, 32)}
        </Text>
      </group>

      {node.table.note && (
        <group
          position={[
            -dimensions.width / 2 + CARD_HORIZONTAL_PADDING + BADGE_WIDTH / 2,
            headerY,
            dimensions.depth / 2 + 0.012,
          ]}
        >
          <mesh>
            <boxGeometry args={[BADGE_WIDTH, BADGE_HEIGHT, 0.01]} />
            <meshBasicMaterial color={BADGE_BG_COLOR} transparent opacity={0.95} />
          </mesh>
          <Text
            font={SCENE_FONT_BOLD}
            color={NOTE_BADGE_TEXT_COLOR}
            fontSize={TEXT_BADGE_SIZE}
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.006]}
          >
            {NOTE_ICON_CHAR}
          </Text>
        </group>
      )}

      {visibleColumns.map((column, index) => {
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
            <mesh
              position={[0, rowY, dimensions.depth / 2 + 0.015]}
              onPointerEnter={(event) => {
                event.stopPropagation();
                onColumnHoverChange?.(toColumnHoverContext(node, column));
              }}
              onPointerLeave={(event) => {
                event.stopPropagation();
                onColumnHoverChange?.(toTableHoverContext(node));
              }}
            >
              <boxGeometry args={[rowSliceWidth, CARD_ROW_HEIGHT * 0.86, 0.015]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

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
              <group
                position={[
                  badgeGroupRightX -
                    badges.length * (BADGE_WIDTH + BADGE_GAP) -
                    BADGE_WIDTH / 2 -
                    (badges.length > 0 ? BADGE_GAP : 0),
                  rowY,
                  dimensions.depth / 2 + 0.012,
                ]}
              >
                <mesh>
                  <boxGeometry args={[BADGE_WIDTH, BADGE_HEIGHT, 0.01]} />
                  <meshBasicMaterial color={BADGE_BG_COLOR} transparent opacity={0.95} />
                </mesh>
                <Text
                  font={SCENE_FONT_BOLD}
                  color={NOTE_BADGE_TEXT_COLOR}
                  fontSize={TEXT_BADGE_SIZE}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, 0, 0.006]}
                >
                  {NOTE_ICON_CHAR}
                </Text>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
