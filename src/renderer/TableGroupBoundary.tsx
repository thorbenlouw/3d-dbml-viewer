import { useEffect, useMemo, type ReactElement } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { TableGroupBoundingBox } from '@/types';
import { SCENE_FONT_BOLD } from './constants';

const BOUNDARY_COLOR = '#4a90d9';
const BOUNDARY_FILL_OPACITY = 0.06;
const BOUNDARY_EDGE_OPACITY = 0.28;
const LABEL_COLOR = '#7bc8ff';
const LABEL_SIZE = 0.22;

interface TableGroupBoundaryProps {
  boundary: TableGroupBoundingBox;
}

export default function TableGroupBoundary({ boundary }: TableGroupBoundaryProps): ReactElement {
  const { centerX, centerY, centerZ, width, height, depth, groupName } = boundary;

  const boxGeometry = useMemo(
    () => new THREE.BoxGeometry(width, height, depth),
    [width, height, depth],
  );

  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(boxGeometry), [boxGeometry]);

  useEffect(() => {
    return () => {
      boxGeometry.dispose();
      edgesGeometry.dispose();
    };
  }, [boxGeometry, edgesGeometry]);

  return (
    <group position={[centerX, centerY, centerZ]}>
      {/* Translucent fill — BackSide to avoid Z-fighting with table cards */}
      <mesh geometry={boxGeometry}>
        <meshBasicMaterial
          color={BOUNDARY_COLOR}
          transparent
          opacity={BOUNDARY_FILL_OPACITY}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={BOUNDARY_COLOR} transparent opacity={BOUNDARY_EDGE_OPACITY} />
      </lineSegments>

      {/* Group name label positioned above the box */}
      <Text
        position={[0, height * 0.5 + LABEL_SIZE * 0.8, depth * 0.5]}
        fontSize={LABEL_SIZE}
        color={LABEL_COLOR}
        font={SCENE_FONT_BOLD}
        anchorX="center"
        anchorY="bottom"
        renderOrder={1}
      >
        {groupName}
      </Text>
    </group>
  );
}
