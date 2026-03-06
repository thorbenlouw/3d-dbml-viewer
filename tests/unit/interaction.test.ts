import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resolveMarkerPlacementPosition,
  SCENE_INTERACTION_ROLE,
  SCENE_ROLE_FOCUS_MARKER,
  SCENE_ROLE_TABLE_CARD,
  shouldBlockFocusMarkerPlacement,
} from '@/renderer/interaction';

function buildCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

describe('interaction', () => {
  it('shouldBlockFocusMarkerPlacement blocks intersections with table/marker ancestors', () => {
    const parent = new THREE.Group();
    parent.userData[SCENE_INTERACTION_ROLE] = SCENE_ROLE_TABLE_CARD;
    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    parent.add(child);

    const intersections = [
      {
        object: child,
        distance: 1,
        point: new THREE.Vector3(),
      } as THREE.Intersection,
    ];
    expect(shouldBlockFocusMarkerPlacement(intersections)).toBe(true);

    parent.userData[SCENE_INTERACTION_ROLE] = SCENE_ROLE_FOCUS_MARKER;
    expect(shouldBlockFocusMarkerPlacement(intersections)).toBe(true);

    parent.userData[SCENE_INTERACTION_ROLE] = 'link';
    expect(shouldBlockFocusMarkerPlacement(intersections)).toBe(false);
  });

  it('resolveMarkerPlacementPosition projects to world placement plane on empty space', () => {
    const scene = new THREE.Scene();
    const result = resolveMarkerPlacementPosition({
      clientX: 50,
      clientY: 50,
      canvasRect: new DOMRect(0, 0, 100, 100),
      camera: buildCamera(),
      scene,
      placementPlaneZ: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0, 4);
    expect(result!.y).toBeCloseTo(0, 4);
    expect(result!.z).toBeCloseTo(0, 4);
  });

  it('resolveMarkerPlacementPosition returns null when double-click intersects a table', () => {
    const scene = new THREE.Scene();
    const tableGroup = new THREE.Group();
    tableGroup.userData[SCENE_INTERACTION_ROLE] = SCENE_ROLE_TABLE_CARD;
    const tableMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 0.2),
      new THREE.MeshBasicMaterial(),
    );
    tableMesh.position.set(0, 0, 0);
    tableGroup.add(tableMesh);
    scene.add(tableGroup);
    scene.updateMatrixWorld(true);

    const result = resolveMarkerPlacementPosition({
      clientX: 50,
      clientY: 50,
      canvasRect: new DOMRect(0, 0, 100, 100),
      camera: buildCamera(),
      scene,
      placementPlaneZ: 0,
    });

    expect(result).toBeNull();
  });
});
