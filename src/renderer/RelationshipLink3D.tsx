import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { TableCardNode } from '@/types';
import {
  LINK_COLOR,
  LINK_SEGMENTS,
  LINK_TUBE_RADIAL_SEGMENTS,
  LINK_TUBE_RADIUS,
} from './constants';
import { buildRelationshipLinkRoute } from './linkRouting';
import { computeRowSideAnchor } from './tableCardAnchors';

interface RelationshipLink3DProps {
  sourceNode: TableCardNode;
  targetNode: TableCardNode;
  sourceFieldName: string | null;
  targetFieldName: string | null;
  linkIndex: number;
  parallelCount: number;
}

function buildTubeGeometry(
  sourceNode: TableCardNode,
  targetNode: TableCardNode,
  sourceFieldName: string | null,
  targetFieldName: string | null,
  cameraQuaternion: THREE.Quaternion,
  linkIndex: number,
  parallelCount: number,
): THREE.TubeGeometry {
  const source = computeRowSideAnchor(sourceNode, targetNode, sourceFieldName, cameraQuaternion);
  const target = computeRowSideAnchor(targetNode, sourceNode, targetFieldName, cameraQuaternion);

  const route = buildRelationshipLinkRoute({
    source,
    target,
    linkIndex,
    parallelCount,
  });

  const curve = new THREE.CubicBezierCurve3(route[0], route[1], route[2], route[3]);
  return new THREE.TubeGeometry(curve, LINK_SEGMENTS, LINK_TUBE_RADIUS, LINK_TUBE_RADIAL_SEGMENTS);
}

export default function RelationshipLink3D({
  sourceNode,
  targetNode,
  sourceFieldName,
  targetFieldName,
  linkIndex,
  parallelCount,
}: RelationshipLink3DProps): ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const initialGeometry = useMemo(() => {
    return buildTubeGeometry(
      sourceNode,
      targetNode,
      sourceFieldName,
      targetFieldName,
      camera.quaternion,
      linkIndex,
      parallelCount,
    );
  }, [
    sourceNode,
    targetNode,
    sourceFieldName,
    targetFieldName,
    camera.quaternion,
    linkIndex,
    parallelCount,
  ]);

  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.geometry.dispose();
    };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const nextGeometry = buildTubeGeometry(
      sourceNode,
      targetNode,
      sourceFieldName,
      targetFieldName,
      camera.quaternion,
      linkIndex,
      parallelCount,
    );

    const previousGeometry = mesh.geometry;
    mesh.geometry = nextGeometry;
    previousGeometry.dispose();
  });

  return (
    <mesh ref={meshRef} geometry={initialGeometry}>
      <meshBasicMaterial color={LINK_COLOR} transparent opacity={0.8} />
    </mesh>
  );
}
