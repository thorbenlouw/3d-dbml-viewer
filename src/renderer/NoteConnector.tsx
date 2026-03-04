import { useMemo, type ReactElement } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { NOTE_CONNECTOR_COLOR, NOTE_CONNECTOR_LINE_WIDTH } from './constants';

interface NoteConnectorProps {
  from: [number, number, number];
  to: [number, number, number];
}

export default function NoteConnector({ from, to }: NoteConnectorProps): ReactElement {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(end, start);
    const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(0.4);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5).add(perp);

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    return curve.getPoints(16).map((p) => p.toArray() as [number, number, number]);
  }, [from, to]);

  return (
    <Line points={points} color={NOTE_CONNECTOR_COLOR} lineWidth={NOTE_CONNECTOR_LINE_WIDTH} />
  );
}
