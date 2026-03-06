import {
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
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
import {
  CONNECTION_SCALE_DEFAULT,
  CONNECTION_SCALE_MAX,
  CONNECTION_SCALE_MIN,
  CONNECTION_SCALE_UNITS_PER_SECOND,
  HOLD_CONTROL_INTERVAL_MS,
  PANEL_BG_COLOR,
  PANEL_BORDER_COLOR,
  PANEL_TEXT_COLOR,
  FOCUS_MARKER_MIN_SCREEN_PX,
  FOCUS_MARKER_PLACEMENT_PLANE_Z,
  FOCUS_MARKER_Z_OFFSET,
  RESET_TWEEN_DURATION_MS,
  SCENE_BG_COLOR,
  ZOOM_SCALE_DEFAULT,
  ZOOM_SCALE_MAX,
  ZOOM_SCALE_MIN,
  ZOOM_SCALE_UNITS_PER_SECOND,
} from './constants';
import TableCard from './TableCard';
import RelationshipLink3D from './RelationshipLink3D';
import { estimateTableCardDimensions } from './tableCardMetrics';
import { useForceSimulation } from '@/layout/useForceSimulation';
import NavigationPanel from './NavigationPanel';
import {
  getReferencesForContext,
  getInboundReferencesForContext,
  shouldHighlightRelationship,
  type ReferencesForContext,
} from './hoverContext';
import LoadFileButton from '@/ui/LoadFileButton';
import FocusMarker from './FocusMarker';
import { resolveMarkerPlacementPosition } from './interaction';
import { activateFocusMarker, activateStickyFocus, toggleStickyTable } from './focusMode';
import TableGroupBoundary from './TableGroupBoundary';
import { computeGroupBoundaries } from '@/layout';

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
  pendingTweenRef: RefObject<CameraFrame | null>;
  settledFrameRef: RefObject<CameraFrame | null>;
  shouldTweenToSettledRef: RefObject<boolean>;
  focusMarkerPosition: THREE.Vector3 | null;
  stickyTableId: string | null;
  stickyNodePosition: THREE.Vector3 | null;
  zoomScale: number;
  onZoomScaleFromControls: (nextZoomScale: number) => void;
}

interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface StickyFocusOptions {
  tableId: string;
  cardById: Map<string, TableCardNode>;
  linkModels: RelationshipLinkModel[];
  camera: THREE.Camera;
  fovDeg: number;
}

interface DraggableTableCardProps {
  node: TableCardNode;
  isSticky: boolean;
  highlightedColumn?: string | '__table__';
  onTableHoverChange?: (value: HoverContext | null) => void;
  onColumnHoverChange?: (value: HoverContext | null) => void;
  onHeaderDoubleClick?: (tableId: string) => void;
}

interface AdjustButtonProps {
  text: string;
  ariaLabel: string;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

interface FocusMarkerState {
  schema: ParsedSchema;
  position: THREE.Vector3;
}

interface SceneInteractionLayerProps {
  enabled: boolean;
  focusMarkerPosition: THREE.Vector3 | null;
  onFocusMarkerDoubleClick: () => void;
  onEmptySpaceDoubleClick: (position: THREE.Vector3) => void;
}

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(6, 4, 12);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

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

function buildStickyFocusFrame({
  tableId,
  cardById,
  linkModels,
  camera,
  fovDeg,
}: StickyFocusOptions): CameraFrame | null {
  const stickyNode = cardById.get(tableId);
  if (!stickyNode) return null;

  const neighbourIds = new Set<string>();
  for (const link of linkModels) {
    if (link.sourceId === tableId) neighbourIds.add(link.targetId);
    if (link.targetId === tableId) neighbourIds.add(link.sourceId);
  }

  const focusNodes = [stickyNode];
  for (const neighbourId of neighbourIds) {
    const node = cardById.get(neighbourId);
    if (node) focusNodes.push(node);
  }

  const target = new THREE.Vector3(stickyNode.x, stickyNode.y, stickyNode.z);
  const currentViewDirection = camera.position.clone().sub(target).normalize();

  let offsetDirection = currentViewDirection.clone();
  if (focusNodes.length > 2) {
    // Approximate the plane normal from neighbour vectors around the sticky node.
    const normal = new THREE.Vector3();
    for (let i = 1; i < focusNodes.length - 1; i += 1) {
      const v1 = new THREE.Vector3(
        focusNodes[i].x - stickyNode.x,
        focusNodes[i].y - stickyNode.y,
        focusNodes[i].z - stickyNode.z,
      );
      for (let j = i + 1; j < focusNodes.length; j += 1) {
        const v2 = new THREE.Vector3(
          focusNodes[j].x - stickyNode.x,
          focusNodes[j].y - stickyNode.y,
          focusNodes[j].z - stickyNode.z,
        );
        normal.add(v1.cross(v2));
      }
    }

    if (normal.lengthSq() > 1e-6) {
      normal.normalize();
      if (normal.dot(currentViewDirection) < 0) normal.multiplyScalar(-1);
      offsetDirection = normal;
    }
  }

  const fovRad = THREE.MathUtils.degToRad(fovDeg);
  let fitRadius = 0.6;
  for (const node of focusNodes) {
    const nodeCenter = new THREE.Vector3(node.x, node.y, node.z);
    const toNode = nodeCenter.sub(target);
    const projected = toNode.addScaledVector(offsetDirection, -toNode.dot(offsetDirection));
    const dimensions = estimateTableCardDimensions(node.table);
    const cardRadius =
      Math.sqrt(dimensions.width * dimensions.width + dimensions.height * dimensions.height) * 0.5;
    fitRadius = Math.max(fitRadius, projected.length() + cardRadius);
  }

  const distance = Math.max(fitRadius / Math.tan(fovRad * 0.5), 3.5);
  return {
    target,
    position: target.clone().add(offsetDirection.multiplyScalar(distance * 1.1)),
  };
}

function AdjustButton({
  text,
  ariaLabel,
  onHoldStart,
  onHoldEnd,
}: AdjustButtonProps): ReactElement {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        onHoldStart();
      }}
      onPointerUp={onHoldEnd}
      onPointerLeave={onHoldEnd}
      onPointerCancel={onHoldEnd}
      style={{
        backgroundColor: '#1e293b',
        border: `1px solid ${PANEL_BORDER_COLOR}`,
        color: PANEL_TEXT_COLOR,
        borderRadius: '0.375rem',
        padding: 0,
        cursor: 'pointer',
        fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
        fontSize: '0.95rem',
        fontWeight: 600,
        lineHeight: 1,
        width: '2rem',
        height: '1.8rem',
        display: 'grid',
        placeItems: 'center',
      }}
      aria-label={ariaLabel}
    >
      {text}
    </button>
  );
}

function CameraController({
  tweenStateRef,
  controlsRef,
  pendingTweenRef,
  settledFrameRef,
  shouldTweenToSettledRef,
  focusMarkerPosition,
  stickyTableId,
  stickyNodePosition,
  zoomScale,
  onZoomScaleFromControls,
}: CameraControllerProps): null {
  const previousFocusPositionRef = useRef<THREE.Vector3 | null>(null);
  const previousFocusKeyRef = useRef<string | null>(null);
  const previousZoomScaleRef = useRef(zoomScale);
  const previousDistanceRef = useRef<number | null>(null);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    const currentDistance = camera.position.distanceTo(controls.target);
    if (previousDistanceRef.current === null) {
      previousDistanceRef.current = currentDistance;
    }

    // Check for pending settle tween request
    if (shouldTweenToSettledRef.current && settledFrameRef.current) {
      shouldTweenToSettledRef.current = false;
      tweenStateRef.current = {
        active: true,
        startPosition: camera.position.clone(),
        endPosition: settledFrameRef.current.position,
        startTarget: controls.target.clone(),
        endTarget: settledFrameRef.current.target,
        startTime: Date.now(),
      };
    }

    // Check for ad-hoc tween request (reset view, fly-to)
    if (pendingTweenRef.current) {
      const frame = pendingTweenRef.current;
      pendingTweenRef.current = null;
      tweenStateRef.current = {
        active: true,
        startPosition: camera.position.clone(),
        endPosition: frame.position,
        startTarget: controls.target.clone(),
        endTarget: frame.target,
        startTime: Date.now(),
      };
    }

    const state = tweenStateRef.current;
    if (state && state.active) {
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
        previousDistanceRef.current = camera.position.distanceTo(controls.target);
      }
      return;
    }

    const activeFocusPosition = focusMarkerPosition ?? stickyNodePosition;
    const activeFocusKey = focusMarkerPosition
      ? 'marker'
      : stickyTableId && stickyNodePosition
        ? `sticky:${stickyTableId}`
        : null;

    if (activeFocusPosition && activeFocusKey) {
      if (previousFocusKeyRef.current !== activeFocusKey) {
        const focusDelta = activeFocusPosition.clone().sub(controls.target);
        controls.target.add(focusDelta);
        camera.position.add(focusDelta);
        previousFocusKeyRef.current = activeFocusKey;
        previousFocusPositionRef.current = activeFocusPosition.clone();
      } else if (previousFocusPositionRef.current) {
        const delta = activeFocusPosition.clone().sub(previousFocusPositionRef.current);
        if (delta.lengthSq() > 1e-8) {
          controls.target.add(delta);
          camera.position.add(delta);
        }
        previousFocusPositionRef.current.copy(activeFocusPosition);
      }
      controls.update();
    } else {
      previousFocusKeyRef.current = null;
      previousFocusPositionRef.current = null;
    }

    if (Math.abs(previousZoomScaleRef.current - zoomScale) > 1e-8) {
      const offset = camera.position.clone().sub(controls.target);
      const currentDistance = offset.length();
      if (currentDistance > 0.0001) {
        const ratio = zoomScale / Math.max(previousZoomScaleRef.current, 1e-6);
        const nextDistance = THREE.MathUtils.clamp(
          currentDistance * ratio,
          controls.minDistance,
          controls.maxDistance,
        );
        camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(nextDistance));
        previousDistanceRef.current = nextDistance;
      }
      previousZoomScaleRef.current = zoomScale;
      controls.update();
      return;
    }

    const distanceAfterUpdates = camera.position.distanceTo(controls.target);
    const previousDistance = previousDistanceRef.current;
    if (previousDistance && Math.abs(distanceAfterUpdates - previousDistance) > 1e-6) {
      const ratio = distanceAfterUpdates / previousDistance;
      const nextZoomScale = THREE.MathUtils.clamp(
        previousZoomScaleRef.current * ratio,
        ZOOM_SCALE_MIN,
        ZOOM_SCALE_MAX,
      );
      previousZoomScaleRef.current = nextZoomScale;
      previousDistanceRef.current = distanceAfterUpdates;
      onZoomScaleFromControls(nextZoomScale);
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

function CameraInitialiser({ cameraRef }: { cameraRef: RefObject<THREE.Camera | null> }): null {
  const { camera } = useThree();

  useEffect(() => {
    cameraRef.current = camera;
    return () => {
      cameraRef.current = null;
    };
  }, [camera, cameraRef]);

  return null;
}

function SceneInteractionLayer({
  enabled,
  focusMarkerPosition,
  onFocusMarkerDoubleClick,
  onEmptySpaceDoubleClick,
}: SceneInteractionLayerProps): null {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;
    const handleDoubleClick = (event: MouseEvent): void => {
      if ((event as MouseEvent & { __focusMarkerHandled?: boolean }).__focusMarkerHandled) {
        return;
      }

      if (focusMarkerPosition) {
        const projected = focusMarkerPosition
          .clone()
          .add(new THREE.Vector3(0, 0, FOCUS_MARKER_Z_OFFSET))
          .project(camera);
        const markerClientX =
          canvas.getBoundingClientRect().left + (projected.x + 1) * 0.5 * canvas.clientWidth;
        const markerClientY =
          canvas.getBoundingClientRect().top + (1 - projected.y) * 0.5 * canvas.clientHeight;
        const markerHitRadiusPx = Math.max(FOCUS_MARKER_MIN_SCREEN_PX * 0.65, 18);
        const dx = event.clientX - markerClientX;
        const dy = event.clientY - markerClientY;
        if (dx * dx + dy * dy <= markerHitRadiusPx * markerHitRadiusPx) {
          onFocusMarkerDoubleClick();
          return;
        }
      }

      const position = resolveMarkerPlacementPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        camera,
        scene,
        canvasRect: canvas.getBoundingClientRect(),
        placementPlaneZ: FOCUS_MARKER_PLACEMENT_PLANE_Z,
      });
      if (!position) return;
      onEmptySpaceDoubleClick(position);
    };

    canvas.addEventListener('dblclick', handleDoubleClick);
    return () => {
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [
    camera,
    enabled,
    focusMarkerPosition,
    gl,
    onEmptySpaceDoubleClick,
    onFocusMarkerDoubleClick,
    scene,
  ]);

  return null;
}

function DraggableTableCard({
  node,
  isSticky,
  highlightedColumn,
  onTableHoverChange,
  onColumnHoverChange,
  onHeaderDoubleClick,
}: DraggableTableCardProps): ReactElement {
  return (
    <TableCard
      node={node}
      highlightedColumn={highlightedColumn}
      onTableHoverChange={onTableHoverChange}
      onColumnHoverChange={onColumnHoverChange}
      onHeaderDoubleClick={onHeaderDoubleClick}
      isSticky={isSticky}
    />
  );
}

export default function Scene({ schema, onLoadFile }: SceneProps): ReactElement {
  const hasWebGL = useMemo(() => {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  }, []);

  const [hoverContext, setHoverContext] = useState<HoverContext | null>(null);
  const [stickyTableId, setStickyTableId] = useState<string | null>(null);
  const [focusMarkerState, setFocusMarkerState] = useState<FocusMarkerState | null>(null);
  const [linkDistanceScale, setLinkDistanceScale] = useState(CONNECTION_SCALE_DEFAULT);
  const [connectionHoldDirection, setConnectionHoldDirection] = useState(0);
  const [zoomScale, setZoomScale] = useState(ZOOM_SCALE_DEFAULT);
  const [zoomHoldDirection, setZoomHoldDirection] = useState(0);
  const stickyTableIdForSchema = useMemo(() => {
    if (!stickyTableId) return null;
    return schema.tables.some((table) => table.id === stickyTableId) ? stickyTableId : null;
  }, [stickyTableId, schema.tables]);

  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const settledFrameRef = useRef<CameraFrame | null>(null);
  const hasFittedOnceRef = useRef<boolean>(false);
  const shouldTweenToSettledRef = useRef<boolean>(false);
  const pendingTweenRef = useRef<CameraFrame | null>(null);
  const stickyTableIdRef = useRef<string | null>(null);

  useEffect(() => {
    stickyTableIdRef.current = stickyTableIdForSchema;
  }, [stickyTableIdForSchema]);
  const focusMarkerPosition = useMemo(() => {
    if (!focusMarkerState) return null;
    return focusMarkerState.schema === schema ? focusMarkerState.position : null;
  }, [focusMarkerState, schema]);

  const handleSettled = useCallback(
    (settledNodes: SimulationNode[]) => {
      const tableMap = new Map(schema.tables.map((t) => [t.id, t]));
      const points: THREE.Vector3[] = [];
      for (const node of settledNodes) {
        const table = tableMap.get(node.id);
        if (!table) continue;
        const dimensions = estimateTableCardDimensions(table);
        points.push(
          new THREE.Vector3(
            node.x - dimensions.width * 0.5,
            node.y - dimensions.height * 0.5,
            node.z,
          ),
        );
        points.push(
          new THREE.Vector3(
            node.x + dimensions.width * 0.5,
            node.y + dimensions.height * 0.5,
            node.z + dimensions.depth,
          ),
        );
      }
      const frame = computeCameraFrameFromPoints(points, 60);
      settledFrameRef.current = frame;

      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!hasFittedOnceRef.current) {
        // First settlement: snap camera immediately
        if (camera && controls) {
          camera.position.copy(frame.position);
          controls.target.copy(frame.target);
          controls.update();
        } else {
          // Refs can be null briefly during initial mount; queue an immediate tween fallback.
          shouldTweenToSettledRef.current = true;
        }
        hasFittedOnceRef.current = true;
      } else {
        // Subsequent settlement (new file loaded): request tween via flag
        shouldTweenToSettledRef.current = true;
      }
    },
    [schema.tables],
  );

  const { nodes: simNodes } = useForceSimulation(schema, {
    onSettled: handleSettled,
    stickyTableId: stickyTableIdForSchema,
    linkDistanceScale,
  });

  const cardNodes = useMemo(() => buildCardNodes(simNodes, schema), [simNodes, schema]);
  const linkModels = useMemo(() => buildLinkModels(schema), [schema]);
  const cardById = useMemo(() => new Map(cardNodes.map((node) => [node.id, node])), [cardNodes]);

  const cardDimensionMap = useMemo(() => {
    const map = new Map<string, { width: number; height: number; depth: number }>();
    for (const cardNode of cardNodes) {
      map.set(cardNode.id, estimateTableCardDimensions(cardNode.table));
    }
    return map;
  }, [cardNodes]);

  const groupBoundaries = useMemo(
    () => computeGroupBoundaries(schema, cardNodes, cardDimensionMap),
    [schema, cardNodes, cardDimensionMap],
  );

  const effectiveStickyTableId = useMemo(() => {
    if (!stickyTableIdForSchema || !cardById.has(stickyTableIdForSchema)) return null;
    return stickyTableIdForSchema;
  }, [stickyTableIdForSchema, cardById]);
  const stickyNodePosition = useMemo(() => {
    if (!effectiveStickyTableId) return null;
    const stickyNode = cardById.get(effectiveStickyTableId);
    return stickyNode ? new THREE.Vector3(stickyNode.x, stickyNode.y, stickyNode.z) : null;
  }, [effectiveStickyTableId, cardById]);

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

    // Include group boundary extents so Reset View fits all groups
    for (const b of groupBoundaries) {
      points.push(
        new THREE.Vector3(b.centerX - b.width * 0.5, b.centerY - b.height * 0.5, b.centerZ),
      );
      points.push(
        new THREE.Vector3(
          b.centerX + b.width * 0.5,
          b.centerY + b.height * 0.5,
          b.centerZ + b.depth,
        ),
      );
    }

    return points;
  }, [cardNodes, linkModels, cardById, groupBoundaries]);

  const tweenStateRef = useRef<CameraTweenState>({
    active: false,
    startPosition: DEFAULT_CAMERA_POSITION.clone(),
    endPosition: DEFAULT_CAMERA_POSITION.clone(),
    startTarget: DEFAULT_CAMERA_TARGET.clone(),
    endTarget: DEFAULT_CAMERA_TARGET.clone(),
    startTime: 0,
  });

  const references = useMemo<ReferencesForContext | null>(() => {
    if (!hoverContext) return null;
    return getReferencesForContext(schema, hoverContext);
  }, [hoverContext, schema]);
  const enrichedHoverContext = useMemo<HoverContext | null>(() => {
    if (!hoverContext) return null;
    const inbound = getInboundReferencesForContext(schema, hoverContext);
    return { ...hoverContext, ...inbound };
  }, [hoverContext, schema]);
  const focusMode = useMemo(() => {
    if (focusMarkerPosition) return 'marker';
    if (effectiveStickyTableId) return `sticky:${effectiveStickyTableId}`;
    return 'none';
  }, [focusMarkerPosition, effectiveStickyTableId]);
  const helpText = useMemo(() => {
    if (focusMode === 'none') {
      return 'Double-click a Table or point in space to set and remove a fixed marker to rotate around';
    }
    if (focusMode === 'marker') {
      return 'Double-click the marker again to release the rotation anchor';
    }
    return 'Double-click the highlighted table again to release the rotation anchor';
  }, [focusMode]);
  const zoomDisplayValue = useMemo(() => 1 / Math.max(zoomScale, 1e-6), [zoomScale]);
  const handleZoomScaleFromControls = useCallback((nextZoomScale: number) => {
    setZoomScale((current) => {
      if (Math.abs(current - nextZoomScale) < 1e-6) return current;
      return nextZoomScale;
    });
  }, []);

  useEffect(() => {
    if (connectionHoldDirection === 0) return;

    const intervalId = window.setInterval(() => {
      setLinkDistanceScale((current) =>
        THREE.MathUtils.clamp(
          current +
            connectionHoldDirection *
              (CONNECTION_SCALE_UNITS_PER_SECOND * (HOLD_CONTROL_INTERVAL_MS / 1000)),
          CONNECTION_SCALE_MIN,
          CONNECTION_SCALE_MAX,
        ),
      );
    }, HOLD_CONTROL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [connectionHoldDirection]);

  useEffect(() => {
    if (zoomHoldDirection === 0) return;

    const intervalId = window.setInterval(() => {
      setZoomScale((current) =>
        THREE.MathUtils.clamp(
          current +
            zoomHoldDirection * (ZOOM_SCALE_UNITS_PER_SECOND * (HOLD_CONTROL_INTERVAL_MS / 1000)),
          ZOOM_SCALE_MIN,
          ZOOM_SCALE_MAX,
        ),
      );
    }, HOLD_CONTROL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [zoomHoldDirection]);

  const handleResetView = useCallback((): void => {
    const activeFocusPosition = focusMarkerPosition ?? stickyNodePosition;
    if (activeFocusPosition) {
      const controls = controlsRef.current;
      if (controls) {
        const offset = controls.object.position.clone().sub(controls.target);
        pendingTweenRef.current = {
          target: activeFocusPosition.clone(),
          position: activeFocusPosition.clone().add(offset),
        };
        return;
      }
    }

    const resetFrame = settledFrameRef.current ?? computeCameraFrameFromPoints(framePoints, 60);
    pendingTweenRef.current = resetFrame;
  }, [focusMarkerPosition, framePoints, stickyNodePosition]);

  const handleFocusSticky = useCallback(
    (tableId: string): void => {
      const controls = controlsRef.current;
      if (!controls) return;

      const frame = buildStickyFocusFrame({
        tableId,
        cardById,
        linkModels,
        camera: controls.object,
        fovDeg: 60,
      });
      if (!frame) return;

      pendingTweenRef.current = frame;
    },
    [cardById, linkModels],
  );

  const handleHeaderDoubleClick = useCallback(
    (tableId: string): void => {
      const currentStickyTableId = stickyTableIdRef.current;
      const nextStickyTableId = toggleStickyTable(currentStickyTableId, tableId);
      if (nextStickyTableId === null) {
        setStickyTableId(null);
        return;
      }

      const stickyState = activateStickyFocus(nextStickyTableId);
      setFocusMarkerState(null);
      setStickyTableId(stickyState.stickyTableId);
      handleFocusSticky(tableId);
    },
    [handleFocusSticky],
  );

  const handleEmptySpaceDoubleClick = useCallback(
    (position: THREE.Vector3): void => {
      const markerState = activateFocusMarker(position);
      setStickyTableId(markerState.stickyTableId);
      if (markerState.focusMarkerPosition) {
        setFocusMarkerState({ schema, position: markerState.focusMarkerPosition });
      }
    },
    [schema],
  );

  const handleRemoveFocusMarker = useCallback((): void => {
    setFocusMarkerState(null);
  }, []);

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
        <NavigationPanel
          hoverContext={enrichedHoverContext}
          references={references}
          projectName={schema.projectName}
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      data-testid="scene-root"
      data-focus-mode={focusMode}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{
          position: [
            DEFAULT_CAMERA_POSITION.x,
            DEFAULT_CAMERA_POSITION.y,
            DEFAULT_CAMERA_POSITION.z,
          ],
          fov: 60,
        }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <CameraInitialiser cameraRef={cameraRef} />
        <color attach="background" args={[SCENE_BG_COLOR]} />
        <OrbitControls
          ref={controlsRef}
          target={[DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z]}
          minDistance={3}
          maxDistance={40}
          enableDamping
          dampingFactor={0.1}
        />
        <SceneInteractionLayer
          enabled
          focusMarkerPosition={focusMarkerPosition}
          onFocusMarkerDoubleClick={handleRemoveFocusMarker}
          onEmptySpaceDoubleClick={handleEmptySpaceDoubleClick}
        />
        <CameraController
          tweenStateRef={tweenStateRef}
          controlsRef={controlsRef}
          pendingTweenRef={pendingTweenRef}
          settledFrameRef={settledFrameRef}
          shouldTweenToSettledRef={shouldTweenToSettledRef}
          focusMarkerPosition={focusMarkerPosition}
          stickyTableId={effectiveStickyTableId}
          stickyNodePosition={stickyNodePosition}
          zoomScale={zoomScale}
          onZoomScaleFromControls={handleZoomScaleFromControls}
        />

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

        {groupBoundaries.map((boundary) => (
          <TableGroupBoundary key={boundary.groupId} boundary={boundary} />
        ))}

        {cardNodes.map((node) => {
          const highlightedColumn =
            hoverContext?.tableId === node.id
              ? (hoverContext.columnName ?? '__table__')
              : undefined;
          return (
            <DraggableTableCard
              key={node.id}
              node={node}
              isSticky={node.id === effectiveStickyTableId}
              highlightedColumn={highlightedColumn}
              onTableHoverChange={setHoverContext}
              onColumnHoverChange={setHoverContext}
              onHeaderDoubleClick={handleHeaderDoubleClick}
            />
          );
        })}
        {focusMarkerPosition && (
          <FocusMarker position={focusMarkerPosition} onRemove={handleRemoveFocusMarker} />
        )}
      </Canvas>

      <NavigationPanel
        hoverContext={enrichedHoverContext}
        references={references}
        projectName={schema.projectName}
      />

      <LoadFileButton onLoad={onLoadFile} />
      <div
        style={{
          position: 'fixed',
          left: '1rem',
          bottom: '5.7rem',
          display: 'grid',
          gap: '0.5rem',
          zIndex: 40,
          background: PANEL_BG_COLOR,
          border: `1px solid ${PANEL_BORDER_COLOR}`,
          borderRadius: '0.5rem',
          padding: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '0.25rem',
            border: `1px solid ${PANEL_BORDER_COLOR}`,
            borderRadius: '0.4rem',
            padding: '0.35rem',
          }}
        >
          <div style={{ color: PANEL_TEXT_COLOR, fontSize: '0.75rem', fontWeight: 600 }}>
            Spacing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AdjustButton
              text="-"
              ariaLabel="Decrease spacing"
              onHoldStart={() => setConnectionHoldDirection(-1)}
              onHoldEnd={() => setConnectionHoldDirection(0)}
            />
            <div
              style={{
                color: PANEL_TEXT_COLOR,
                fontSize: '0.8rem',
                minWidth: '3.7rem',
                textAlign: 'center',
              }}
            >
              {linkDistanceScale.toFixed(2)}x
            </div>
            <AdjustButton
              text="+"
              ariaLabel="Increase spacing"
              onHoldStart={() => setConnectionHoldDirection(1)}
              onHoldEnd={() => setConnectionHoldDirection(0)}
            />
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gap: '0.25rem',
            border: `1px solid ${PANEL_BORDER_COLOR}`,
            borderRadius: '0.4rem',
            padding: '0.35rem',
          }}
        >
          <div style={{ color: PANEL_TEXT_COLOR, fontSize: '0.75rem', fontWeight: 600 }}>Zoom</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AdjustButton
              text="-"
              ariaLabel="Decrease zoom length"
              onHoldStart={() => setZoomHoldDirection(1)}
              onHoldEnd={() => setZoomHoldDirection(0)}
            />
            <div
              style={{
                color: PANEL_TEXT_COLOR,
                fontSize: '0.8rem',
                minWidth: '3.7rem',
                textAlign: 'center',
              }}
            >
              {zoomDisplayValue.toFixed(2)}x
            </div>
            <AdjustButton
              text="+"
              ariaLabel="Increase zoom length"
              onHoldStart={() => setZoomHoldDirection(-1)}
              onHoldEnd={() => setZoomHoldDirection(0)}
            />
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gap: '0.25rem',
            border: `1px solid ${PANEL_BORDER_COLOR}`,
            borderRadius: '0.4rem',
            padding: '0.35rem',
          }}
        >
          <div style={{ color: PANEL_TEXT_COLOR, fontSize: '0.75rem', fontWeight: 600 }}>View</div>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset camera to overview"
            style={{
              backgroundColor: '#1e293b',
              border: `1px solid ${PANEL_BORDER_COLOR}`,
              color: PANEL_TEXT_COLOR,
              borderRadius: '0.375rem',
              padding: '0.3rem 0.6rem',
              cursor: 'pointer',
              fontFamily: "'Lexend', 'Helvetica Neue', Arial, sans-serif",
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.75rem',
          color: PANEL_TEXT_COLOR,
          background: PANEL_BG_COLOR,
          opacity: 0.7,
          padding: '0.25rem',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {helpText}
      </div>
    </div>
  );
}
