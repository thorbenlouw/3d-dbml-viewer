import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  CARD_EDGE_COLOR,
  NOTE_PANEL_MAX_WIDTH,
  NOTE_PANEL_MAX_HEIGHT,
  NOTE_PANEL_PADDING,
  SCENE_FONT_BOLD,
  SCENE_FONT_REGULAR,
  TEXT_ROW_SIZE,
  TEXT_BADGE_SIZE,
} from './constants';

interface NotePanelProps {
  ownerLabel: string;
  noteText: string;
  position: [number, number, number];
  onClose: () => void;
}

const PANEL_WIDTH = NOTE_PANEL_MAX_WIDTH;
const PANEL_HEIGHT = NOTE_PANEL_MAX_HEIGHT;
const PANEL_DEPTH = 0.04;
const HEADER_HEIGHT = 0.28;
const CLOSE_BTN_SIZE = 0.18;
const PANEL_BG_COLOR = '#FCD34D';
const HEADER_COLOR = '#F59E0B';
const PANEL_TEXT_COLOR = '#1C1917';
const CAMERA_DISTANCE = 4;

export default function NotePanel({
  ownerLabel,
  noteText,
  position,
  onClose,
}: NotePanelProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const panelGeometry = useMemo(
    () => new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, PANEL_DEPTH),
    [],
  );
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(panelGeometry), [panelGeometry]);

  useEffect(() => {
    return () => {
      panelGeometry.dispose();
      edgesGeometry.dispose();
    };
  }, [panelGeometry, edgesGeometry]);

  const _forward = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!groupRef.current) return;
    // Always render directly in front of the camera
    camera.getWorldDirection(_forward);
    groupRef.current.position
      .copy(camera.position)
      .addScaledVector(_forward, CAMERA_DISTANCE)
      .addScaledVector(camera.up, 0.3);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  const headerY = PANEL_HEIGHT / 2 - HEADER_HEIGHT / 2;
  const closeX = PANEL_WIDTH / 2 - CLOSE_BTN_SIZE / 2 - NOTE_PANEL_PADDING;
  const closeY = PANEL_HEIGHT / 2 - CLOSE_BTN_SIZE / 2 - NOTE_PANEL_PADDING;
  const bodyTextY = PANEL_HEIGHT / 2 - HEADER_HEIGHT - NOTE_PANEL_PADDING * 2;
  const bodyMaxWidth = PANEL_WIDTH - NOTE_PANEL_PADDING * 4;

  return (
    <group ref={groupRef} position={position}>
      {/* Background */}
      <mesh>
        <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, PANEL_DEPTH]} />
        <meshBasicMaterial color={PANEL_BG_COLOR} transparent opacity={0.97} />
      </mesh>

      {/* Header background */}
      <mesh position={[0, headerY, PANEL_DEPTH / 2 + 0.001]}>
        <boxGeometry args={[PANEL_WIDTH, HEADER_HEIGHT, 0.002]} />
        <meshBasicMaterial color={HEADER_COLOR} />
      </mesh>

      {/* Edge outline */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={CARD_EDGE_COLOR} />
      </lineSegments>

      {/* Header label */}
      <Text
        font={SCENE_FONT_BOLD}
        color={PANEL_TEXT_COLOR}
        fontSize={TEXT_ROW_SIZE}
        position={[-PANEL_WIDTH / 2 + NOTE_PANEL_PADDING, headerY, PANEL_DEPTH / 2 + 0.012]}
        anchorX="left"
        anchorY="middle"
        maxWidth={PANEL_WIDTH - CLOSE_BTN_SIZE - NOTE_PANEL_PADDING * 3}
      >
        {ownerLabel}
      </Text>

      {/* Body text */}
      <Text
        font={SCENE_FONT_REGULAR}
        color={PANEL_TEXT_COLOR}
        fontSize={TEXT_BADGE_SIZE * 1.2}
        position={[-PANEL_WIDTH / 2 + NOTE_PANEL_PADDING * 2, bodyTextY, PANEL_DEPTH / 2 + 0.012]}
        anchorX="left"
        anchorY="top"
        maxWidth={bodyMaxWidth}
      >
        {noteText}
      </Text>

      {/* Close button */}
      <group position={[closeX, closeY, PANEL_DEPTH / 2 + 0.002]}>
        <mesh onClick={onClose}>
          <boxGeometry args={[CLOSE_BTN_SIZE, CLOSE_BTN_SIZE, 0.002]} />
          <meshBasicMaterial color={PANEL_TEXT_COLOR} transparent opacity={0.8} />
        </mesh>
        <Text
          font={SCENE_FONT_REGULAR}
          color={PANEL_BG_COLOR}
          fontSize={TEXT_ROW_SIZE}
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.006]}
        >
          {'✕'}
        </Text>
      </group>
    </group>
  );
}
