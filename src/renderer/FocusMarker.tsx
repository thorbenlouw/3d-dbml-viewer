import type { ReactElement } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import {
  FOCUS_MARKER_BASE_DIAMETER,
  FOCUS_MARKER_CENTER_RADIUS,
  FOCUS_MARKER_COLOR,
  FOCUS_MARKER_CROSS_LENGTH,
  FOCUS_MARKER_CROSS_THICKNESS,
  FOCUS_MARKER_MIN_SCREEN_PX,
  FOCUS_MARKER_OUTER_RADIUS,
  FOCUS_MARKER_RING_THICKNESS,
  FOCUS_MARKER_Z_OFFSET,
} from './constants';
import { SCENE_INTERACTION_ROLE, SCENE_ROLE_FOCUS_MARKER } from './interaction';

interface FocusMarkerProps {
  position: THREE.Vector3;
  onRemove: () => void;
}

export default function FocusMarker({ position, onRemove }: FocusMarkerProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const centerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const crossXMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const crossYMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const hitMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera, size } = useThree();

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData[SCENE_INTERACTION_ROLE] = SCENE_ROLE_FOCUS_MARKER;
    }
    if (ringMaterialRef.current) ringMaterialRef.current.depthWrite = false;
    if (centerMaterialRef.current) centerMaterialRef.current.depthWrite = false;
    if (crossXMaterialRef.current) crossXMaterialRef.current.depthWrite = false;
    if (crossYMaterialRef.current) crossYMaterialRef.current.depthWrite = false;
    if (hitMaterialRef.current) hitMaterialRef.current.depthWrite = false;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    groupRef.current.quaternion.copy(camera.quaternion);
    if (camera instanceof THREE.PerspectiveCamera) {
      const distance = camera.position.distanceTo(groupRef.current.position);
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const worldHeightAtDistance = 2 * Math.tan(fovRad * 0.5) * distance;
      const minWorldDiameter =
        (FOCUS_MARKER_MIN_SCREEN_PX / Math.max(size.height, 1)) * worldHeightAtDistance;
      const scale = Math.max(1, minWorldDiameter / FOCUS_MARKER_BASE_DIAMETER);
      groupRef.current.scale.setScalar(scale);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    (event.nativeEvent as MouseEvent & { __focusMarkerHandled?: boolean }).__focusMarkerHandled =
      true;
    onRemove();
  };

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z + FOCUS_MARKER_Z_OFFSET]}
      onDoubleClick={handleDoubleClick}
    >
      <mesh>
        <ringGeometry args={[FOCUS_MARKER_OUTER_RADIUS, FOCUS_MARKER_RING_THICKNESS, 32]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color={FOCUS_MARKER_COLOR}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[FOCUS_MARKER_CENTER_RADIUS, 20]} />
        <meshBasicMaterial
          ref={centerMaterialRef}
          color={FOCUS_MARKER_COLOR}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[FOCUS_MARKER_CROSS_LENGTH, FOCUS_MARKER_CROSS_THICKNESS, 0.01]} />
        <meshBasicMaterial ref={crossXMaterialRef} color={FOCUS_MARKER_COLOR} />
      </mesh>
      <mesh>
        <boxGeometry args={[FOCUS_MARKER_CROSS_THICKNESS, FOCUS_MARKER_CROSS_LENGTH, 0.01]} />
        <meshBasicMaterial ref={crossYMaterialRef} color={FOCUS_MARKER_COLOR} />
      </mesh>
      <mesh>
        <circleGeometry args={[FOCUS_MARKER_OUTER_RADIUS * 1.8, 20]} />
        <meshBasicMaterial ref={hitMaterialRef} transparent opacity={0} />
      </mesh>
    </group>
  );
}
