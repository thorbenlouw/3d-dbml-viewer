import { useRef, useMemo, type ReactElement } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { LayoutNode } from '@/types';
import {
  BOX_WIDTH,
  BOX_HEIGHT,
  BOX_DEPTH,
  OPACITY_NEAR,
  OPACITY_FAR,
  DISTANCE_NEAR,
  DISTANCE_FAR,
} from './constants';

interface TableBoxProps {
  node: LayoutNode;
}

export default function TableBox({ node }: TableBoxProps): ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH), []);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(boxGeometry), [boxGeometry]);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;

    // Billboarding — face always toward camera
    meshRef.current.quaternion.copy(camera.quaternion);

    // Compute distance from camera to mesh world position
    const worldPos = new THREE.Vector3(node.x, node.y, node.z);
    const dist = camera.position.distanceTo(worldPos);

    // Linear interpolation of opacity
    const t = Math.max(0, Math.min(1, (DISTANCE_FAR - dist) / (DISTANCE_FAR - DISTANCE_NEAR)));
    materialRef.current.opacity = OPACITY_FAR + t * (OPACITY_NEAR - OPACITY_FAR);
  });

  return (
    <mesh ref={meshRef} position={[node.x, node.y, node.z]}>
      <boxGeometry args={[BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH]} />
      <meshBasicMaterial ref={materialRef} color="#1C95D3" transparent opacity={OPACITY_FAR} />
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#1C95D3" />
      </lineSegments>
      <Text
        color="#FFFFFF"
        fontSize={0.18}
        position={[0, 0, BOX_DEPTH / 2 + 0.01]}
        anchorX="center"
        anchorY="middle"
        maxWidth={BOX_WIDTH - 0.2}
      >
        {node.name}
      </Text>
    </mesh>
  );
}
