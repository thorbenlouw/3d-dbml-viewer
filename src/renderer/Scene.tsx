import {
  useRef,
  useCallback,
  useMemo,
  type ReactElement,
  type RefObject,
  type ComponentRef,
} from 'react';
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
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startTime: number;
}

interface CameraControllerProps {
  tweenStateRef: RefObject<CameraTweenState>;
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>;
}

function easeInOutCubic(t: number): number {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function CameraController({ tweenStateRef, controlsRef }: CameraControllerProps): null {
  const { camera } = useThree();

  useFrame(() => {
    const state = tweenStateRef.current;
    const controls = controlsRef.current;
    if (!state || !controls || !state.active) return;

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
    }
  });

  return null;
}

interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

function computeCameraFrame(nodes: LayoutNode[], fovDeg: number): CameraFrame {
  if (nodes.length === 0) {
    return {
      position: new THREE.Vector3(6, 4, 12),
      target: new THREE.Vector3(0, 0, 0),
    };
  }

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

  const target = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  const radius = Math.sqrt(
    Math.pow((maxX - minX) / 2, 2) +
      Math.pow((maxY - minY) / 2, 2) +
      Math.pow((maxZ - minZ) / 2, 2),
  );

  const fovRad = THREE.MathUtils.degToRad(fovDeg);
  const fitDistance = radius > 0 ? radius / Math.tan(fovRad / 2) : 8;
  const distance = Math.max(fitDistance * 1.25, 8);
  const viewDirection = new THREE.Vector3(0.8, 0.4, 1).normalize();
  const position = target.clone().add(viewDirection.multiplyScalar(distance));

  return { position, target };
}

export default function Scene({ nodes }: SceneProps): ReactElement {
  const hasWebGL = useMemo(() => {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  }, []);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null);
  const initialFrame = computeCameraFrame(nodes, 60);

  const tweenStateRef = useRef<CameraTweenState>({
    active: false,
    startPosition: initialFrame.position.clone(),
    endPosition: initialFrame.position.clone(),
    startTarget: initialFrame.target.clone(),
    endTarget: initialFrame.target.clone(),
    startTime: 0,
  });

  const handleResetView = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const resetFrame = computeCameraFrame(nodes, 60);
    tweenStateRef.current.active = true;
    tweenStateRef.current.startPosition = controls.object.position.clone();
    tweenStateRef.current.endPosition = resetFrame.position;
    tweenStateRef.current.startTarget = controls.target.clone();
    tweenStateRef.current.endTarget = resetFrame.target;
    tweenStateRef.current.startTime = Date.now();
  }, [nodes]);

  if (hasWebGL === false) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          background: '#0B1020',
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
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{
          position: [initialFrame.position.x, initialFrame.position.y, initialFrame.position.z],
          fov: 60,
        }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0B1020']} />
        <OrbitControls
          ref={controlsRef}
          target={[initialFrame.target.x, initialFrame.target.y, initialFrame.target.z]}
          minDistance={3}
          maxDistance={40}
          enableDamping
          dampingFactor={0.1}
        />
        <CameraController tweenStateRef={tweenStateRef} controlsRef={controlsRef} />
        {nodes.map((node) => (
          <TableBox key={node.id} node={node} />
        ))}
      </Canvas>
      <ResetViewButton onClick={handleResetView} />
    </div>
  );
}
