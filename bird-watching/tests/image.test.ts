import { describe, expect, it } from 'vitest';
import { cropRect } from '@/lib/identify/image';

describe('cropRect', () => {
  it('centres a square of half the shorter side on the tap', () => {
    expect(cropRect(4000, 3000, 0.5, 0.5)).toEqual({ x: 1250, y: 750, side: 1500 });
  });
  it('stays inside the photo when the tap is near an edge', () => {
    expect(cropRect(4000, 3000, 0.99, 0.01)).toEqual({ x: 2500, y: 0, side: 1500 });
  });
});
