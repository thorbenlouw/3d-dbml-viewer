import {
  HOP_OPACITY_0,
  HOP_OPACITY_1,
  HOP_OPACITY_2,
  HOP_OPACITY_FAR,
  HOP_OPACITY_LERP_SPEED,
} from './constants';

export function getHopOpacityTarget(hopDistance: number | null | undefined): number {
  if (hopDistance == null) return 1;
  if (hopDistance === 0) return HOP_OPACITY_0;
  if (hopDistance === 1) return HOP_OPACITY_1;
  if (hopDistance === 2) return HOP_OPACITY_2;
  return HOP_OPACITY_FAR;
}

export function lerpHopOpacity(current: number, target: number): number {
  return current + (target - current) * HOP_OPACITY_LERP_SPEED;
}
