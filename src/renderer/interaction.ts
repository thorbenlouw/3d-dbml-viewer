import * as THREE from 'three';

export const SCENE_INTERACTION_ROLE = 'sceneInteractionRole';
export const SCENE_ROLE_TABLE_CARD = 'table-card';
export const SCENE_ROLE_FOCUS_MARKER = 'focus-marker';

const BLOCKING_ROLES = new Set([SCENE_ROLE_TABLE_CARD, SCENE_ROLE_FOCUS_MARKER]);

function hasBlockingRole(object: THREE.Object3D | null): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    const role = current.userData?.[SCENE_INTERACTION_ROLE];
    if (typeof role === 'string' && BLOCKING_ROLES.has(role)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function shouldBlockFocusMarkerPlacement(intersections: THREE.Intersection[]): boolean {
  return intersections.some((intersection) => hasBlockingRole(intersection.object));
}

export interface ResolveMarkerPlacementInput {
  clientX: number;
  clientY: number;
  canvasRect: DOMRect;
  camera: THREE.Camera;
  scene: THREE.Scene;
  placementPlaneZ: number;
}

/**
 * Resolves empty-space marker placement by intersecting the pointer ray with a fixed world-Z plane.
 * This keeps placement deterministic regardless of camera orientation and depth-buffer contents.
 */
export function resolveMarkerPlacementPosition({
  clientX,
  clientY,
  canvasRect,
  camera,
  scene,
  placementPlaneZ,
}: ResolveMarkerPlacementInput): THREE.Vector3 | null {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return null;

  const ndc = new THREE.Vector2(
    ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
    -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1,
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObjects(scene.children, true);
  if (shouldBlockFocusMarkerPlacement(intersections)) {
    return null;
  }

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -placementPlaneZ);
  const position = new THREE.Vector3();
  const didIntersect = raycaster.ray.intersectPlane(plane, position);
  return didIntersect ? position.clone() : null;
}
