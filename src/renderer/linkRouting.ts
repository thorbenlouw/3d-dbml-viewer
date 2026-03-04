import * as THREE from 'three';
import {
  LINK_CURVE_TENSION,
  LINK_DEPTH_LIFT,
  LINK_DEPTH_LIFT_PER_PARALLEL,
  LINK_ENDPOINT_FANOUT_OFFSET,
} from './constants';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface LinkRouteInput {
  source: Vector3Like;
  target: Vector3Like;
  linkIndex: number;
  parallelCount: number;
}

function getSideAxis(direction: THREE.Vector3): THREE.Vector3 {
  const upAxis =
    Math.abs(direction.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const sideAxis = new THREE.Vector3().crossVectors(direction, upAxis);
  if (sideAxis.lengthSq() <= Number.EPSILON) {
    return new THREE.Vector3(1, 0, 0);
  }
  return sideAxis.normalize();
}

export function buildRelationshipLinkRoute(input: LinkRouteInput): THREE.Vector3[] {
  const source = new THREE.Vector3(input.source.x, input.source.y, input.source.z);
  const target = new THREE.Vector3(input.target.x, input.target.y, input.target.z);
  const direction = target.clone().sub(source);
  const normalizedDirection =
    direction.lengthSq() > Number.EPSILON ? direction.normalize() : new THREE.Vector3(1, 0, 0);

  const offsetCenter = (input.parallelCount - 1) / 2;
  const offsetIndex = input.linkIndex - offsetCenter;
  const sideAxis = getSideAxis(normalizedDirection);
  const endpointOffset = sideAxis.multiplyScalar(offsetIndex * LINK_ENDPOINT_FANOUT_OFFSET);

  const start = source.clone().add(endpointOffset);
  const end = target.clone().add(endpointOffset);
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const depthLift = LINK_DEPTH_LIFT + Math.abs(offsetIndex) * LINK_DEPTH_LIFT_PER_PARALLEL;
  const controlA = start.clone().lerp(mid, LINK_CURVE_TENSION);
  const controlB = end.clone().lerp(mid, LINK_CURVE_TENSION);

  controlA.z += depthLift;
  controlB.z += depthLift;

  return [start, controlA, controlB, end];
}
