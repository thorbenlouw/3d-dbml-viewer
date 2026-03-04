import { useRef, useState, useCallback, type ReactElement, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { LayoutNode } from '@/types';
import { RESET_TWEEN_DURATION_MS } from './constants';
import TableBox from './TableBox';
import ResetViewButton from './ResetViewButton';

interface SceneProps {
  nodes: LayoutNode[];
}

interface CameraTweenState {
  active: boolean;
  target: THREE.Vector3;
  startTime: number;
}

interface CameraControllerProps {
  tweenStateRef: RefObject<CameraTweenState>;
}

function CameraController({ tweenStateRef }: CameraControllerProps): null {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const state = tweenStateRef.current;
    if (!state || !state.active) return;

    const elapsed = Date.now() - state.startTime;
    const progress = Math.min(elapsed / RESET_TWEEN_DURATION_MS, 1);

    camera.position.lerp(state.target, delta * 5);

    if (progress >= 1 || camera.position.distanceTo(state.target) < 0.01) {
      camera.position.copy(state.target);
      state.active = false;
    }
  });

  return null;
}

function computeResetPosition(nodes: LayoutNode[]): THREE.Vector3 {
  if (nodes.length === 0) return new THREE.Vector3(0, 0, 20);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z;
    if (n.z > maxZ) maxZ = n.z;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const radius = Math.sqrt(
    Math.pow((maxX - minX) / 2, 2) +
      Math.pow((maxY - minY) / 2, 2) +
      Math.pow((maxZ - minZ) / 2, 2),
  );

  const distance = radius * 2.5 + 5;
  return new THREE.Vector3(cx, cy, cz + distance);
}

export default function Scene({ nodes }: SceneProps): ReactElement {
  const initialCameraPos = computeResetPosition(nodes);

  const tweenStateRef = useRef<CameraTweenState>({
    active: false,
    target: initialCameraPos,
    startTime: 0,
  });

  const [, forceUpdate] = useState(0);

  const handleResetView = useCallback(() => {
    tweenStateRef.current.active = true;
    tweenStateRef.current.target = computeResetPosition(nodes);
    tweenStateRef.current.startTime = Date.now();
    forceUpdate((n) => n + 1);
  }, [nodes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [initialCameraPos.x, initialCameraPos.y, initialCameraPos.z], fov: 60 }}
      >
        <color attach="background" args={['#FFFFFF']} />
        <OrbitControls enableDamping dampingFactor={0.1} />
        <CameraController tweenStateRef={tweenStateRef} />
        {nodes.map((node) => (
          <TableBox key={node.id} node={node} />
        ))}
      </Canvas>
      <ResetViewButton onClick={handleResetView} />
    </div>
  );
}
