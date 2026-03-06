import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { activateFocusMarker, activateStickyFocus, toggleStickyTable } from '@/renderer/focusMode';

describe('focusMode', () => {
  it('activateFocusMarker clears sticky and clones marker position', () => {
    const position = new THREE.Vector3(1, 2, 3);
    const result = activateFocusMarker(position);

    expect(result.stickyTableId).toBeNull();
    expect(result.focusMarkerPosition).toEqual(position);
    expect(result.focusMarkerPosition).not.toBe(position);
  });

  it('activateStickyFocus clears marker and keeps table id', () => {
    const result = activateStickyFocus('orders');

    expect(result.stickyTableId).toBe('orders');
    expect(result.focusMarkerPosition).toBeNull();
  });

  it('toggleStickyTable toggles the same table off', () => {
    expect(toggleStickyTable('users', 'users')).toBeNull();
    expect(toggleStickyTable('users', 'orders')).toBe('orders');
    expect(toggleStickyTable(null, 'orders')).toBe('orders');
  });
});
