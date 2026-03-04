import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import * as THREE from 'three';
import type { ActiveNote, ParsedColumn, TableCardNode } from '@/types';
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
  DISTANCE_FAR,
  DISTANCE_NEAR,
  NOTE_HIGHLIGHT_COLOR,
  NOTE_ICON_CHAR,
  NOTE_ICON_SIZE,
  OPACITY_FAR,
  OPACITY_NEAR,
  TEXT_BADGE_SIZE,
  TEXT_COLOR,
  TEXT_HEADER_SIZE,
  TEXT_ROW_SIZE,
} from './constants';
import { estimateTableCardDimensions } from './tableCardMetrics';

interface DragHandlers {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}

interface TableCardProps {
  node: TableCardNode;
  highlightedColumn?: string | '__table__';
  onNoteClick?: (note: ActiveNote) => void;
  dragHandlers?: DragHandlers;
  isPinned?: boolean;
}

interface FieldBadge {
  label: string;
  active: boolean;
}

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

export default function TableCard({
  node,
  highlightedColumn,
  onNoteClick,
  dragHandlers,
  isPinned = false,
}: TableCardProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const headerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const bodyMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const worldPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const { camera } = useThree();
  const [showPinTooltip, setShowPinTooltip] = useState(false);

  const dimensions = useMemo(() => estimateTableCardDimensions(node.table), [node.table]);

  const handleTableNoteClick = useCallback(() => {
    if (!onNoteClick || !node.table.note) return;
    const anchorPos: [number, number, number] = [
      node.x + dimensions.width / 2,
      node.y + dimensions.height / 2 - CARD_HEADER_HEIGHT / 2,
      node.z + dimensions.depth / 2,
    ];
    onNoteClick({
      tableId: node.id,
      columnName: undefined,
      noteText: node.table.note,
      ownerLabel: `Table: ${node.table.name}`,
      anchorWorldPosition: anchorPos,
      cardPosition: [node.x, node.y, node.z],
    });
  }, [onNoteClick, node, dimensions]);

  const makeColumnNoteClickHandler = useCallback(
    (column: ParsedColumn, rowY: number) => () => {
      if (!onNoteClick || !column.note) return;
      const anchorPos: [number, number, number] = [
        node.x + dimensions.width / 2,
        node.y + rowY,
        node.z + dimensions.depth / 2,
      ];
      onNoteClick({
        tableId: node.id,
        columnName: column.name,
        noteText: column.note,
        ownerLabel: `${node.table.name}.${column.name}`,
        anchorWorldPosition: anchorPos,
        cardPosition: [node.x, node.y, node.z],
      });
    },
    [onNoteClick, node, dimensions],
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
  });

  return (
    <group ref={groupRef} position={[node.x, node.y, node.z]}>
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
          color={highlightedColumn === '__table__' ? NOTE_HIGHLIGHT_COLOR : CARD_HEADER_COLOR}
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
          onDoubleClick={dragHandlers.onDoubleClick}
        >
          <boxGeometry args={[dimensions.width, dimensions.height, 0.01]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Pin indicator */}
      {isPinned && (
        <group
          position={[
            dimensions.width / 2 - 0.1,
            dimensions.height / 2 - CARD_HEADER_HEIGHT / 2,
            dimensions.depth / 2 + 0.02,
          ]}
          onPointerEnter={() => setShowPinTooltip(true)}
          onPointerLeave={() => setShowPinTooltip(false)}
        >
          <mesh>
            <sphereGeometry args={[0.06, 12, 8]} />
            <meshBasicMaterial color="white" transparent opacity={0.8} />
          </mesh>
          {showPinTooltip && (
            <Text
              color="white"
              fontSize={0.07}
              position={[-0.35, 0, 0.01]}
              anchorX="right"
              anchorY="middle"
            >
              double-click to release
            </Text>
          )}
        </group>
      )}

      <Text
        color={TEXT_COLOR}
        fontSize={TEXT_HEADER_SIZE}
        position={[0, headerY, dimensions.depth / 2 + 0.012]}
        anchorX="center"
        anchorY="middle"
        maxWidth={dimensions.width - CARD_HORIZONTAL_PADDING * 2}
      >
        {truncate(node.table.name, 32)}
      </Text>

      {node.table.note && (
        <group
          position={[
            dimensions.width / 2 - CARD_HORIZONTAL_PADDING,
            headerY,
            dimensions.depth / 2 + 0.015,
          ]}
        >
          <mesh onClick={handleTableNoteClick}>
            <boxGeometry args={[0.18, CARD_HEADER_HEIGHT * 0.8, 0.01]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
          <Text
            color={NOTE_HIGHLIGHT_COLOR}
            fontSize={NOTE_ICON_SIZE}
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.006]}
          >
            {NOTE_ICON_CHAR}
          </Text>
        </group>
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
            <mesh position={[0, rowY, dimensions.depth / 2 - rowSliceDepth / 2 + 0.001]}>
              <boxGeometry args={[rowSliceWidth, CARD_ROW_HEIGHT * 0.86, rowSliceDepth]} />
              <meshBasicMaterial
                color={
                  isHighlighted
                    ? NOTE_HIGHLIGHT_COLOR
                    : index % 2 === 0
                      ? CARD_ROW_EVEN_COLOR
                      : CARD_ROW_ODD_COLOR
                }
              />
            </mesh>

            <Text
              color={TEXT_COLOR}
              fontSize={TEXT_ROW_SIZE}
              position={[leftX, rowY, dimensions.depth / 2 + 0.02]}
              anchorX="left"
              anchorY="middle"
              maxWidth={dimensions.width * 0.42}
            >
              {truncate(column.name, 24)}
            </Text>

            <Text
              color={TEXT_COLOR}
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
                    (badges.length > 0 ? badges.length * (BADGE_WIDTH + BADGE_GAP) + 0.1 : 0),
                  rowY,
                  dimensions.depth / 2 + 0.015,
                ]}
              >
                <mesh onClick={makeColumnNoteClickHandler(column, rowY)}>
                  <boxGeometry args={[0.16, CARD_ROW_HEIGHT * 0.8, 0.01]} />
                  <meshBasicMaterial transparent opacity={0} />
                </mesh>
                <Text
                  color={NOTE_HIGHLIGHT_COLOR}
                  fontSize={NOTE_ICON_SIZE}
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
