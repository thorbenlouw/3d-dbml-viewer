import { describe, expect, it } from 'vitest';
import {
  HOP_OPACITY_0,
  HOP_OPACITY_1,
  HOP_OPACITY_2,
  HOP_OPACITY_FAR,
  HOP_OPACITY_LERP_SPEED,
} from '@/renderer/constants';
import { getHopOpacityTarget, lerpHopOpacity } from '@/renderer/hopOpacity';

describe('getHopOpacityTarget', () => {
  it('returns full opacity when sticky mode is inactive', () => {
    expect(getHopOpacityTarget(null)).toBe(1);
    expect(getHopOpacityTarget(undefined)).toBe(1);
  });

  it('maps hop distances to the Feature 21 opacity levels', () => {
    expect(getHopOpacityTarget(0)).toBe(HOP_OPACITY_0);
    expect(getHopOpacityTarget(1)).toBe(HOP_OPACITY_1);
    expect(getHopOpacityTarget(2)).toBe(HOP_OPACITY_2);
    expect(getHopOpacityTarget(3)).toBe(HOP_OPACITY_FAR);
    expect(getHopOpacityTarget(Infinity)).toBe(HOP_OPACITY_FAR);
  });
});

describe('lerpHopOpacity', () => {
  it('moves the current opacity toward the target using the configured lerp speed', () => {
    expect(lerpHopOpacity(1, HOP_OPACITY_FAR)).toBeCloseTo(
      1 + (HOP_OPACITY_FAR - 1) * HOP_OPACITY_LERP_SPEED,
    );
  });

  it('supports smooth recovery when sticky mode deactivates', () => {
    expect(lerpHopOpacity(HOP_OPACITY_FAR, 1)).toBeCloseTo(
      HOP_OPACITY_FAR + (1 - HOP_OPACITY_FAR) * HOP_OPACITY_LERP_SPEED,
    );
  });
});
