import {
  useRef,
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  type RefObject,
  type ComponentRef,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type {
  HoverContext,
  ParsedSchema,
  RelationshipLinkModel,
  SimulationNode,
  TableCardNode,
} from '@/types';
import { PANEL_ACCENT_COLOR, RESET_TWEEN_DURATION_MS, SCENE_BG_COLOR } from './constants';
import TableCard from './TableCard';
import RelationshipLink3D from './RelationshipLink3D';
import { estimateTableCardDimensions } from './tableCardMetrics';
import ResetViewButton from './ResetViewButton';
import { useForceSimulation } from '@/layout/useForceSimulation';
import { useDragCard } from './useDragCard';
import NavigationPanel from './NavigationPanel';
import { getReferencedTablesForTable, shouldHighlightRelationship } from './hoverContext';
import LoadFileButton from '@/ui/LoadFileButton';

interface SceneProps {
  schema: ParsedSchema;
  onLoadFile: (text: string) => void;
}

interface CameraTweenState {
  active: boolean;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startTime: number;
}

interface CameraControllerProps {
  tweenStateRef: RefObject<CameraTweenState>;
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>;
}

interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface DraggableTableCardProps {
  node: TableCardNode;
  highlightedColumn?: string | '__table__';
  onTableHoverChange?: (value: HoverContext | null) => void;
  onColumnHoverChange?: (value: HoverContext | null) => void;
  isRearrangeMode: boolean;
  onDragStart: (id: string, pos: THREE.Vector3) => void;
  onDragMove: (id: string, delta: THREE.Vector3) => void;
  onDragEnd: (id: string, pos: THREE.Vector3, isPinRelease: boolean) => void;
}

function easeInOutCubic(t: number): number {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildCardNodes(nodes: SimulationNode[], schema: ParsedSchema): TableCardNode[] {
  const tableById = new Map(schema.tables.map((table) => [table.id, table]));

  return nodes.flatMap((node) => {
    const table = tableById.get(node.id);
    if (!table) return [];
    return [{ ...node, table }];
  });
}

function buildLinkModels(schema: ParsedSchema): RelationshipLinkModel[] {
  const groupedKeyToRefs = new Map<string, typeof schema.refs>();

  for (const ref of schema.refs) {
    const key = `${ref.sourceId}->${ref.targetId}`;
    const current = groupedKeyToRefs.get(key) ?? [];
    current.push(ref);
    groupedKeyToRefs.set(key, current);
  }

  const models: RelationshipLinkModel[] = [];
  for (const refs of groupedKeyToRefs.values()) {
    refs.forEach((ref, index) => {
      models.push({
        id: ref.id,
        sourceId: ref.sourceId,
        targetId: ref.targetId,
        sourceFieldNames: ref.sourceFieldNames,
        targetFieldNames: ref.targetFieldNames,
        linkIndex: index,
        parallelCount: refs.length,
      });
    });
  }

  return models;
}

function CameraController({ tweenStateRef, controlsRef }: CameraControllerProps): null {
  const { camera } = useThree();

  useFrame(() => {
    const state = tweenStateRef.current;
    const controls = controlsRef.current;
    if (!state || !controls || !state.active) return;

    const elapsed = Date.now() - state.startTime;
    const progress = Math.min(elapsed / RESET_TWEEN_DURATION_MS, 1);
    const eased = easeInOutCubic(progress);

    camera.position.lerpVectors(state.startPosition, state.endPosition, eased);
    controls.target.lerpVectors(state.startTarget, state.endTarget, eased);
    controls.update();

    if (progress >= 1) {
      camera.position.copy(state.endPosition);
      controls.target.copy(state.endTarget);
      state.active = false;
    }
  });

  return null;
}

function computeCameraFrameFromPoints(points: THREE.Vector3[], fovDeg: number): CameraFrame {
  if (points.length === 0) {
    return {
      position: new THREE.Vector3(6, 4, 12),
      target: new THREE.Vector3(0, 0, 0),
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }

  const target = new THREE.Vector3((minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5);
  const radius = Math.sqrt(
    ((maxX - minX) * 0.5) ** 2 + ((maxY - minY) * 0.5) ** 2 + ((maxZ - minZ) * 0.5) ** 2,
  );

  const fovRad = THREE.MathUtils.degToRad(fovDeg);
  const fitDistance = radius > 0 ? radius / Math.tan(fovRad * 0.5) : 8;
  const distance = Math.max(fitDistance * 1.25, 8);
  const viewDirection = new THREE.Vector3(0.8, 0.4, 1).normalize();
  const position = target.clone().add(viewDirection.multiplyScalar(distance));

  return { position, target };
}

function DraggableTableCard({
  node,
  highlightedColumn,
  onTableHoverChange,
  onColumnHoverChange,
  isRearrangeMode,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DraggableTableCardProps): ReactElement {
  const { camera, gl } = useThree();
  const worldPosition = useMemo(
    () => new THREE.Vector3(node.x, node.y, node.z),
    [node.x, node.y, node.z],
  );

  const dragHandlers = useDragCard({
    nodeId: node.id,
    worldPosition,
    camera,
    gl,
    onDragStart,
    onDragMove,
    onDragEnd,
  });

  return (
    <TableCard
      node={node}
      highlightedColumn={highlightedColumn}
      onTableHoverChange={onTableHoverChange}
      onColumnHoverChange={onColumnHoverChange}
      dragHandlers={isRearrangeMode ? dragHandlers : undefined}
    />
  );
}

export default function Scene({ schema, onLoadFile }: SceneProps): ReactElement {
  const hasWebGL = useMemo(() => {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  }, []);

  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [hoverContext, setHoverContext] = useState<HoverContext | null>(null);

  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null);

  const { nodes: simNodes, setPin, nudge } = useForceSimulation(schema);

  const cardNodes = useMemo(() => buildCardNodes(simNodes, schema), [simNodes, schema]);
  const linkModels = useMemo(() => buildLinkModels(schema), [schema]);
  const cardById = useMemo(() => new Map(cardNodes.map((node) => [node.id, node])), [cardNodes]);

  const framePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (const cardNode of cardNodes) {
      const dimensions = estimateTableCardDimensions(cardNode.table);
      points.push(
        new THREE.Vector3(
          cardNode.x - dimensions.width * 0.5,
          cardNode.y - dimensions.height * 0.5,
          cardNode.z,
        ),
      );
      points.push(
        new THREE.Vector3(
          cardNode.x + dimensions.width * 0.5,
          cardNode.y + dimensions.height * 0.5,
          cardNode.z + dimensions.depth,
        ),
      );
    }

    for (const link of linkModels) {
      const source = cardById.get(link.sourceId);
      const target = cardById.get(link.targetId);
      if (!source || !target) continue;

      points.push(new THREE.Vector3(source.x, source.y, source.z));
      points.push(new THREE.Vector3(target.x, target.y, target.z));
      points.push(
        new THREE.Vector3(
          (source.x + target.x) * 0.5,
          (source.y + target.y) * 0.5,
          Math.max(source.z, target.z) + 1,
        ),
      );
    }

    return points;
  }, [cardNodes, linkModels, cardById]);

  const initialFrame = useMemo(() => computeCameraFrameFromPoints(framePoints, 60), [framePoints]);

  const tweenStateRef = useRef<CameraTweenState>({
    active: false,
    startPosition: initialFrame.position.clone(),
    endPosition: initialFrame.position.clone(),
    startTarget: initialFrame.target.clone(),
    endTarget: initialFrame.target.clone(),
    startTime: 0,
  });

  const referencedTables = useMemo(() => {
    if (!hoverContext) return [];
    return getReferencedTablesForTable(schema, hoverContext.tableId);
  }, [hoverContext, schema]);

  const handleResetView = useCallback((): void => {
    const controls = controlsRef.current;
    if (!controls) return;

    const resetFrame = computeCameraFrameFromPoints(framePoints, 60);
    tweenStateRef.current.active = true;
    tweenStateRef.current.startPosition = controls.object.position.clone();
    tweenStateRef.current.endPosition = resetFrame.position;
    tweenStateRef.current.startTarget = controls.target.clone();
    tweenStateRef.current.endTarget = resetFrame.target;
    tweenStateRef.current.startTime = Date.now();
  }, [framePoints]);

  const handleDragStart = useCallback(
    (id: string, pos: THREE.Vector3) => {
      setPin(id, { x: pos.x, y: pos.y, z: pos.z });
      if (controlsRef.current) controlsRef.current.enabled = false;
    },
    [setPin],
  );

  const handleDragMove = useCallback(
    (id: string, delta: THREE.Vector3) => {
      nudge(id, { x: delta.x, y: delta.y, z: delta.z }, 0.6);
    },
    [nudge],
  );

  const handleDragEnd = useCallback(
    (id: string, pos: THREE.Vector3, isPinRelease: boolean) => {
      if (isPinRelease) {
        setPin(id, null);
      } else {
        setPin(id, { x: pos.x, y: pos.y, z: pos.z });
      }
      if (controlsRef.current) controlsRef.current.enabled = true;
    },
    [setPin],
  );

  if (hasWebGL === false) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
          role="status"
          aria-live="polite"
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            background: SCENE_BG_COLOR,
            color: '#E6ECFF',
            fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              WebGL is unavailable in this browser session.
            </p>
            <p style={{ opacity: 0.85 }}>
              3D rendering requires GPU/WebGL support. Try running in a regular desktop browser with
              hardware acceleration enabled.
            </p>
          </div>
        </div>
        <NavigationPanel hoverContext={hoverContext} referencedTables={referencedTables} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{
          position: [initialFrame.position.x, initialFrame.position.y, initialFrame.position.z],
          fov: 60,
        }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[SCENE_BG_COLOR]} />
        <OrbitControls
          ref={controlsRef}
          target={[initialFrame.target.x, initialFrame.target.y, initialFrame.target.z]}
          minDistance={3}
          maxDistance={40}
          enableDamping
          dampingFactor={0.1}
        />
        <CameraController tweenStateRef={tweenStateRef} controlsRef={controlsRef} />

        {linkModels.map((link) => {
          const source = cardById.get(link.sourceId);
          const target = cardById.get(link.targetId);
          if (!source || !target) return null;

          return (
            <RelationshipLink3D
              key={link.id}
              sourceNode={source}
              targetNode={target}
              sourceFieldName={link.sourceFieldNames[0] ?? null}
              targetFieldName={link.targetFieldNames[0] ?? null}
              linkIndex={link.linkIndex}
              parallelCount={link.parallelCount}
              isHighlighted={shouldHighlightRelationship(hoverContext, link)}
            />
          );
        })}

        {cardNodes.map((node) => {
          const highlightedColumn =
            hoverContext?.tableId === node.id
              ? (hoverContext.columnName ?? '__table__')
              : undefined;
          return (
            <DraggableTableCard
              key={node.id}
              node={node}
              highlightedColumn={highlightedColumn}
              onTableHoverChange={setHoverContext}
              onColumnHoverChange={setHoverContext}
              isRearrangeMode={isRearrangeMode}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          );
        })}
      </Canvas>

      <NavigationPanel hoverContext={hoverContext} referencedTables={referencedTables} />

      <LoadFileButton onLoad={onLoadFile} />
      <ResetViewButton onClick={handleResetView} />
      <button
        type="button"
        onClick={() =>
          setIsRearrangeMode((current) => {
            const next = !current;
            if (next) {
              setHoverContext(null);
            }
            return next;
          })
        }
        aria-label={isRearrangeMode ? 'Switch to Navigate mode' : 'Switch to Re-arrange mode'}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '8.2rem',
          backgroundColor: isRearrangeMode ? PANEL_ACCENT_COLOR : '#334155',
          color: '#ffffff',
          fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          zIndex: 40,
        }}
      >
        {isRearrangeMode ? 'Re-arrange Mode' : 'Navigate Mode'}
      </button>
    </div>
  );
}
