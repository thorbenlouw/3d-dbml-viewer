import * as THREE from 'three';

export interface FocusModeState {
  stickyTableId: string | null;
  focusMarkerPosition: THREE.Vector3 | null;
}

export function activateStickyFocus(tableId: string): FocusModeState {
  return {
    stickyTableId: tableId,
    focusMarkerPosition: null,
  };
}

export function activateFocusMarker(position: THREE.Vector3): FocusModeState {
  return {
    stickyTableId: null,
    focusMarkerPosition: position.clone(),
  };
}

export function toggleStickyTable(
  currentStickyTableId: string | null,
  tableId: string,
): string | null {
  return currentStickyTableId === tableId ? null : tableId;
}
