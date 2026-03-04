import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as THREE from 'three';

// Mock THREE.Raycaster so we control ray intersections
const mockIntersectPlane = vi.fn(function (
  this: void,
  _plane: THREE.Plane,
  target: THREE.Vector3,
): THREE.Vector3 {
  target.set(1, 2, 3);
  return target;
});

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockRaycaster = vi.fn(function (this: any) {
    this.setFromCamera = vi.fn();
    this.ray = { intersectPlane: mockIntersectPlane };
  });
  return { ...actual, Raycaster: MockRaycaster };
});

import { useDragCard } from '@/renderer/useDragCard';

type PointerEventLike = {
  nativeEvent: {
    clientX: number;
    clientY: number;
    pointerId: number;
    target: {
      setPointerCapture: ReturnType<typeof vi.fn>;
      releasePointerCapture: ReturnType<typeof vi.fn>;
    };
  };
  stopPropagation: ReturnType<typeof vi.fn>;
};

type MouseEventLike = {
  nativeEvent: { clientX: number; clientY: number };
  stopPropagation: ReturnType<typeof vi.fn>;
};

function makePointerEvent(clientX = 100, clientY = 100): PointerEventLike {
  return {
    nativeEvent: {
      clientX,
      clientY,
      pointerId: 1,
      target: {
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
      },
    },
    stopPropagation: vi.fn(),
  };
}

function makeMouseEvent(): MouseEventLike {
  return {
    nativeEvent: { clientX: 100, clientY: 100 },
    stopPropagation: vi.fn(),
  };
}

function makeMockCamera(): THREE.Camera {
  const camera = new THREE.PerspectiveCamera();
  vi.spyOn(camera, 'getWorldDirection').mockImplementation(function (
    this: void,
    target: THREE.Vector3,
  ) {
    target.set(0, 0, -1);
    return target;
  });
  return camera;
}

function makeMockGl(): THREE.WebGLRenderer {
  return {
    domElement: {
      clientWidth: 800,
      clientHeight: 600,
      style: { cursor: '' },
    },
  } as unknown as THREE.WebGLRenderer;
}

describe('useDragCard', () => {
  const nodeId = 'table-1';
  let worldPosition: THREE.Vector3;
  let camera: THREE.Camera;
  let gl: THREE.WebGLRenderer;
  let onDragStart: (id: string, pos: THREE.Vector3) => void;
  let onDragMove: (id: string, delta: THREE.Vector3) => void;
  let onDragEnd: (id: string, pos: THREE.Vector3, isPinRelease: boolean) => void;

  beforeEach(() => {
    worldPosition = new THREE.Vector3(0, 0, 0);
    camera = makeMockCamera();
    gl = makeMockGl();
    onDragStart = vi.fn() as unknown as typeof onDragStart;
    onDragMove = vi.fn() as unknown as typeof onDragMove;
    onDragEnd = vi.fn() as unknown as typeof onDragEnd;
    mockIntersectPlane.mockImplementation(function (
      this: void,
      _plane: THREE.Plane,
      target: THREE.Vector3,
    ): THREE.Vector3 {
      target.set(1, 2, 3);
      return target;
    });
  });

  it('onPointerDown calls onDragStart with world position', () => {
    const { result } = renderHook(() =>
      useDragCard({ nodeId, worldPosition, camera, gl, onDragStart, onDragMove, onDragEnd }),
    );

    act(() => {
      result.current.onPointerDown(makePointerEvent() as never);
    });

    expect(onDragStart).toHaveBeenCalledOnce();
    expect(onDragStart).toHaveBeenCalledWith(nodeId, expect.any(THREE.Vector3));
    const calledPos = (onDragStart as ReturnType<typeof vi.fn>).mock.calls[0][1] as THREE.Vector3;
    expect(calledPos.x).toBeCloseTo(1);
    expect(calledPos.y).toBeCloseTo(2);
    expect(calledPos.z).toBeCloseTo(3);
  });

  it('onPointerMove after pointerDown calls onDragMove with correct delta', () => {
    const { result } = renderHook(() =>
      useDragCard({ nodeId, worldPosition, camera, gl, onDragStart, onDragMove, onDragEnd }),
    );

    // First intersection at (1, 2, 3)
    mockIntersectPlane.mockImplementationOnce(function (
      this: void,
      _: THREE.Plane,
      target: THREE.Vector3,
    ): THREE.Vector3 {
      target.set(1, 2, 3);
      return target;
    });
    act(() => {
      result.current.onPointerDown(makePointerEvent(100, 100) as never);
    });

    // Second intersection at (3, 4, 5) → delta = (2, 2, 2)
    mockIntersectPlane.mockImplementationOnce(function (
      this: void,
      _: THREE.Plane,
      target: THREE.Vector3,
    ): THREE.Vector3 {
      target.set(3, 4, 5);
      return target;
    });
    act(() => {
      result.current.onPointerMove(makePointerEvent(150, 150) as never);
    });

    expect(onDragMove).toHaveBeenCalledOnce();
    const delta = (onDragMove as ReturnType<typeof vi.fn>).mock.calls[0][1] as THREE.Vector3;
    expect(delta.x).toBeCloseTo(2);
    expect(delta.y).toBeCloseTo(2);
    expect(delta.z).toBeCloseTo(2);
  });

  it('onPointerUp calls onDragEnd; subsequent onPointerMove is a no-op', () => {
    const { result } = renderHook(() =>
      useDragCard({ nodeId, worldPosition, camera, gl, onDragStart, onDragMove, onDragEnd }),
    );

    act(() => {
      result.current.onPointerDown(makePointerEvent() as never);
    });

    act(() => {
      result.current.onPointerUp(makePointerEvent() as never);
    });

    expect(onDragEnd).toHaveBeenCalledOnce();
    expect(onDragEnd).toHaveBeenCalledWith(nodeId, expect.any(THREE.Vector3), false);

    // Subsequent move should be a no-op
    act(() => {
      result.current.onPointerMove(makePointerEvent(200, 200) as never);
    });
    expect(onDragMove).not.toHaveBeenCalled();
  });

  it('onDoubleClick calls onDragEnd with isPinRelease = true', () => {
    const { result } = renderHook(() =>
      useDragCard({ nodeId, worldPosition, camera, gl, onDragStart, onDragMove, onDragEnd }),
    );

    act(() => {
      result.current.onDoubleClick(makeMouseEvent() as never);
    });

    expect(onDragEnd).toHaveBeenCalledOnce();
    expect(onDragEnd).toHaveBeenCalledWith(nodeId, expect.any(THREE.Vector3), true);
  });
});
