import * as THREE from 'three';
import type { TableCardNode } from '@/types';
import {
  CARD_HEADER_HEIGHT,
  CARD_HORIZONTAL_PADDING,
  CARD_ROW_HEIGHT,
  CARD_VERTICAL_PADDING,
} from './constants';
import { estimateTableCardDimensions } from './tableCardMetrics';

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

function getRowIndex(node: TableCardNode, fieldName: string | null): number {
  if (!fieldName) return 0;
  const index = node.table.columns.findIndex((column) => column.name === fieldName);
  return index >= 0 ? index : 0;
}

function getRowCenterLocalY(node: TableCardNode, rowIndex: number): number {
  const dimensions = estimateTableCardDimensions(node.table);
  const rowTop =
    dimensions.height / 2 - CARD_HEADER_HEIGHT - CARD_VERTICAL_PADDING - rowIndex * CARD_ROW_HEIGHT;
  return rowTop - CARD_ROW_HEIGHT / 2;
}

function getRowSliceMetrics(node: TableCardNode): { halfWidth: number; centerZ: number } {
  const dimensions = estimateTableCardDimensions(node.table);
  const rowSliceWidth = dimensions.width - CARD_HORIZONTAL_PADDING * 1.2;
  const rowSliceDepth = dimensions.depth * 0.55;
  const centerZ = dimensions.depth / 2 - rowSliceDepth / 2 + 0.001;

  return {
    halfWidth: rowSliceWidth / 2,
    centerZ,
  };
}

function getCardAxes(cameraQuaternion: THREE.Quaternion): {
  right: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3;
} {
  return {
    right: new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion),
    forward: new THREE.Vector3(0, 0, 1).applyQuaternion(cameraQuaternion),
  };
}

export function computeRowSideAnchor(
  sourceNode: TableCardNode,
  targetPosition: Vector3Like,
  sourceFieldName: string | null,
  cameraQuaternion: THREE.Quaternion,
): THREE.Vector3 {
  const center = new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z);
  const toTarget = new THREE.Vector3(
    targetPosition.x - sourceNode.x,
    targetPosition.y - sourceNode.y,
    targetPosition.z - sourceNode.z,
  );

  const rowIndex = getRowIndex(sourceNode, sourceFieldName);
  const localRowY = getRowCenterLocalY(sourceNode, rowIndex);
  const rowSlice = getRowSliceMetrics(sourceNode);
  const axes = getCardAxes(cameraQuaternion);

  const sideSign = toTarget.dot(axes.right) >= 0 ? 1 : -1;

  return center
    .clone()
    .add(axes.right.multiplyScalar(sideSign * rowSlice.halfWidth))
    .add(axes.up.multiplyScalar(localRowY))
    .add(axes.forward.multiplyScalar(rowSlice.centerZ));
}
