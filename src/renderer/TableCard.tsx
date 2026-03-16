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
import { formatColumnDefaultLabel } from './columnDefault';
import { getVisibleColumns } from './fieldDetailMode';
import { getHopOpacityTarget, lerpHopOpacity } from './hopOpacity';
import { estimateTableCardDimensions } from './tableCardMetrics';
import { SCENE_INTERACTION_ROLE, SCENE_ROLE_TABLE_CARD } from './interaction';

interface TableCardProps {
  node: TableCardNode;
  fieldDetailMode: FieldDetailMode;
  referencedFieldNames?: ReadonlySet<string>;
  isSticky?: boolean;
  hopDistance?: number | null;
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
const SECONDARY_TEXT_COLOR = '#A9BDD3';

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  if (maxChars <= 1) return value.slice(0, maxChars);
  return `${value.slice(0, maxChars - 1)}…`;
}

function getBadges(column: ParsedColumn): FieldBadge[] {
  return [
    { label: 'E', active: column.enumValues !== undefined },
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
    columnDefault: column.default,
    enumValues: column.enumValues,
  };
}

function setMaterialOpacity(
  material: THREE.Material | THREE.Material[] | null | undefined,
  opacity: number,
): void {
  if (!material) return;
  if (Array.isArray(material)) {
    for (const item of material) {
      item.transparent = true;
      item.opacity = opacity;
    }
    return;
  }
  material.transparent = true;
  material.opacity = opacity;
}

function setObjectOpacity(object: THREE.Mesh | null | undefined, opacity: number): void {
  if (!object) return;
  setMaterialOpacity(object.material, opacity);
}

export default function TableCard({
  node,
  fieldDetailMode,
  referencedFieldNames,
  isSticky = false,
  hopDistance = null,
  highlightedColumn,
  onTableHoverChange,
  onColumnHoverChange,
  onHeaderDoubleClick,
}: TableCardProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const headerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const bodyMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const edgeMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const stickyGlowMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const tableHitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const headerHitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const titleTextRef = useRef<THREE.Mesh>(null);
  const headerNoteBadgeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const headerNoteTextRef = useRef<THREE.Mesh>(null);
  const rowMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const rowNameTextRefs = useRef<Array<THREE.Mesh | null>>([]);
  const rowTypeTextRefs = useRef<Array<THREE.Mesh | null>>([]);
  const rowDefaultTextRefs = useRef<Array<THREE.Mesh | null>>([]);
  const fieldBadgeMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const fieldBadgeTextRefs = useRef<Array<THREE.Mesh | null>>([]);
  const fieldNoteBadgeMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const fieldNoteBadgeTextRefs = useRef<Array<THREE.Mesh | null>>([]);
  const worldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const titleScaleGroupRef = useRef<THREE.Group>(null);
  const currentHopOpacityRef = useRef<number>(1);
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
    const distanceOpacity = OPACITY_FAR + t * (OPACITY_NEAR - OPACITY_FAR);

    // Compute target hop opacity and lerp toward it for smooth transitions.
    const targetHopOpacity = getHopOpacityTarget(hopDistance);
    currentHopOpacityRef.current = lerpHopOpacity(currentHopOpacityRef.current, targetHopOpacity);

    const opacity = Math.min(distanceOpacity, currentHopOpacityRef.current);
    headerMaterialRef.current.opacity = opacity;
    if (bodyMaterialRef.current) {
      bodyMaterialRef.current.opacity = opacity;
    }
    if (edgeMaterialRef.current) {
      edgeMaterialRef.current.transparent = true;
      edgeMaterialRef.current.opacity = opacity;
    }
    if (stickyGlowMaterialRef.current) {
      stickyGlowMaterialRef.current.transparent = true;
      stickyGlowMaterialRef.current.opacity = STICKY_BORDER_GLOW_OPACITY * opacity;
    }
    setObjectOpacity(titleTextRef.current, opacity);
    if (headerNoteBadgeMaterialRef.current) {
      headerNoteBadgeMaterialRef.current.opacity = 0.95 * opacity;
    }
    setObjectOpacity(headerNoteTextRef.current, opacity);
    for (const material of rowMaterialRefs.current) {
      if (!material) continue;
      material.transparent = true;
      material.opacity = opacity;
    }
    for (const material of fieldBadgeMaterialRefs.current) {
      if (!material) continue;
      material.transparent = true;
      material.opacity = 0.95 * opacity;
    }
    for (const material of fieldNoteBadgeMaterialRefs.current) {
      if (!material) continue;
      material.transparent = true;
      material.opacity = 0.95 * opacity;
    }
    for (const textRef of rowNameTextRefs.current) setObjectOpacity(textRef, opacity);
    for (const textRef of rowTypeTextRefs.current) setObjectOpacity(textRef, opacity);
    for (const textRef of rowDefaultTextRefs.current) setObjectOpacity(textRef, opacity);
    for (const textRef of fieldBadgeTextRefs.current) setObjectOpacity(textRef, opacity);
    for (const textRef of fieldNoteBadgeTextRefs.current) setObjectOpacity(textRef, opacity);

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
        <lineBasicMaterial
          ref={edgeMaterialRef}
          color={isSticky ? STICKY_BORDER_COLOR : CARD_EDGE_COLOR}
          transparent
          opacity={OPACITY_FAR}
        />
      </lineSegments>
      {isSticky && (
        <lineSegments geometry={edgesGeometry} scale={[1.035, 1.035, 1.035]}>
          <lineBasicMaterial
            ref={stickyGlowMaterialRef}
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
          ref={titleTextRef}
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
            <meshBasicMaterial
              ref={headerNoteBadgeMaterialRef}
              color={BADGE_BG_COLOR}
              transparent
              opacity={0.95}
            />
          </mesh>
          <Text
            ref={headerNoteTextRef}
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
        const defaultLabel = column.default ? formatColumnDefaultLabel(column.default) : undefined;
        const badgeAreaWidth = badges.length * (BADGE_WIDTH + BADGE_GAP);
        const noteBadgeWidth =
          column.note !== undefined ? BADGE_WIDTH + (badges.length > 0 ? BADGE_GAP : 0) : 0;
        const rightDecorationWidth = badgeAreaWidth + noteBadgeWidth;
        const defaultRightX =
          badgeGroupRightX - rightDecorationWidth - (rightDecorationWidth > 0 ? BADGE_GAP : 0);

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
                ref={(element) => {
                  rowMaterialRefs.current[index] = element;
                }}
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
              ref={(element) => {
                rowNameTextRefs.current[index] = element as THREE.Mesh | null;
              }}
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
              ref={(element) => {
                rowTypeTextRefs.current[index] = element as THREE.Mesh | null;
              }}
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

            {defaultLabel && (
              <Text
                ref={(element) => {
                  rowDefaultTextRefs.current[index] = element as THREE.Mesh | null;
                }}
                font={SCENE_FONT_REGULAR}
                color={isHighlighted ? HIGHLIGHT_TEXT_COLOR : SECONDARY_TEXT_COLOR}
                fontSize={TEXT_ROW_SIZE * 0.9}
                position={[defaultRightX, rowY, dimensions.depth / 2 + 0.02]}
                anchorX="right"
                anchorY="middle"
                maxWidth={dimensions.width * 0.26}
              >
                {truncate(defaultLabel, 22)}
              </Text>
            )}

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
                    <meshBasicMaterial
                      ref={(element) => {
                        fieldBadgeMaterialRefs.current[index * 8 + badgeIndex] = element;
                      }}
                      color={BADGE_BG_COLOR}
                      transparent
                      opacity={0.95}
                    />
                  </mesh>
                  <Text
                    ref={(element) => {
                      fieldBadgeTextRefs.current[index * 8 + badgeIndex] =
                        element as THREE.Mesh | null;
                    }}
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
                  <meshBasicMaterial
                    ref={(element) => {
                      fieldNoteBadgeMaterialRefs.current[index] = element;
                    }}
                    color={BADGE_BG_COLOR}
                    transparent
                    opacity={0.95}
                  />
                </mesh>
                <Text
                  ref={(element) => {
                    fieldNoteBadgeTextRefs.current[index] = element as THREE.Mesh | null;
                  }}
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
