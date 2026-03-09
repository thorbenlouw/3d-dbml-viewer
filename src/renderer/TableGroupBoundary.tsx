import { useEffect, useMemo, type ReactElement } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { TableGroupBoundingBox } from '@/types';
import { SCENE_FONT_BOLD } from './constants';
import { resolveGroupBoundaryColor } from './colorUtils';

const BOUNDARY_FILL_OPACITY = 0.06;
const BOUNDARY_EDGE_OPACITY = 0.28;
const LABEL_SIZE = 0.22;

interface TableGroupBoundaryProps {
  boundary: TableGroupBoundingBox;
}

export default function TableGroupBoundary({ boundary }: TableGroupBoundaryProps): ReactElement {
  const { centerX, centerY, centerZ, width, height, depth, groupName, color } = boundary;
  const resolvedColor = resolveGroupBoundaryColor(color);
  const labelColor = useMemo(() => {
    // Lighten the boundary color slightly for the label
    const c = new THREE.Color(resolvedColor);
    c.lerp(new THREE.Color('#ffffff'), 0.4);
    return `#${c.getHexString()}`;
  }, [resolvedColor]);

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
          color={resolvedColor}
          transparent
          opacity={BOUNDARY_FILL_OPACITY}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={resolvedColor} transparent opacity={BOUNDARY_EDGE_OPACITY} />
      </lineSegments>

      {/* Group name label positioned above the box */}
      <Text
        position={[0, height * 0.5 + LABEL_SIZE * 0.8, depth * 0.5]}
        fontSize={LABEL_SIZE}
        color={labelColor}
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
