import { useRef, useCallback, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

export interface DragEndEvent {
  id: string;
  pos: THREE.Vector3;
  isPinRelease: boolean;
}

export function useDragCard(params: {
  nodeId: string;
  worldPosition: THREE.Vector3;
  camera: THREE.Camera;
  gl: THREE.WebGLRenderer;
  onDragStart: (id: string, pos: THREE.Vector3) => void;
  onDragMove: (id: string, delta: THREE.Vector3) => void;
  onDragEnd: (id: string, pos: THREE.Vector3, isPinRelease: boolean) => void;
}): {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
} {
  const { nodeId } = params;

  // Mutable refs so callbacks always see the latest values without re-creation
  const cameraRef = useRef(params.camera);
  const glRef = useRef(params.gl);
  const onDragStartRef = useRef(params.onDragStart);
  const onDragMoveRef = useRef(params.onDragMove);
  const onDragEndRef = useRef(params.onDragEnd);
  const worldPositionRef = useRef(params.worldPosition);

  // Sync refs after each render (not during render, which violates react-hooks/refs)
  useLayoutEffect(() => {
    cameraRef.current = params.camera;
    glRef.current = params.gl;
    onDragStartRef.current = params.onDragStart;
    onDragMoveRef.current = params.onDragMove;
    onDragEndRef.current = params.onDragEnd;
    worldPositionRef.current = params.worldPosition;
  });

  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef(new THREE.Plane());
  const prevWorldRef = useRef(new THREE.Vector3());
  const raycasterRef = useRef(new THREE.Raycaster());

  const computeIntersection = useCallback((clientX: number, clientY: number) => {
    const gl = glRef.current;
    const camera = cameraRef.current;
    const x = (clientX / gl.domElement.clientWidth) * 2 - 1;
    const y = -(clientY / gl.domElement.clientHeight) * 2 + 1;
    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
    const target = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, target);
    return target;
  }, []);

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();

      const camera = cameraRef.current;
      const gl = glRef.current;
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, worldPositionRef.current);

      const intersection = computeIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY);
      prevWorldRef.current.copy(intersection);
      isDraggingRef.current = true;

      (e.nativeEvent.target as Element).setPointerCapture(e.nativeEvent.pointerId);
      gl.domElement.style.cursor = 'grabbing';

      onDragStartRef.current(nodeId, intersection.clone());
    },
    [nodeId, computeIntersection],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDraggingRef.current) return;

      const current = computeIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY);
      const delta = current.clone().sub(prevWorldRef.current);
      prevWorldRef.current.copy(current);
      onDragMoveRef.current(nodeId, delta);
    },
    [nodeId, computeIntersection],
  );

  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      glRef.current.domElement.style.cursor = 'default';
      (e.nativeEvent.target as Element).releasePointerCapture(e.nativeEvent.pointerId);

      onDragEndRef.current(nodeId, prevWorldRef.current.clone(), false);
    },
    [nodeId],
  );

  const onDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      isDraggingRef.current = false;
      onDragEndRef.current(nodeId, worldPositionRef.current.clone(), true);
    },
    [nodeId],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onDoubleClick };
}
