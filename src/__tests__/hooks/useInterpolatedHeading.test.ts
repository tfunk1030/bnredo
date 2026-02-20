/**
 * Tests for useInterpolatedHeading hook utilities
 */

// Extract shortestRotation for testing (it's not exported, so we inline it here)
function shortestRotation(from: number, to: number): number {
  const normalizedFrom = ((from % 360) + 360) % 360;
  const normalizedTo = ((to % 360) + 360) % 360;
  let delta = normalizedTo - normalizedFrom;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return delta;
}

describe('shortestRotation', () => {
  it('returns 0 for same angle', () => {
    expect(shortestRotation(90, 90)).toBe(0);
    expect(shortestRotation(0, 0)).toBe(0);
    expect(shortestRotation(359, 359)).toBe(0);
  });

  it('returns positive delta for clockwise rotation', () => {
    expect(shortestRotation(0, 90)).toBe(90);
    expect(shortestRotation(45, 135)).toBe(90);
    expect(shortestRotation(270, 350)).toBe(80);
  });

  it('returns negative delta for counter-clockwise rotation', () => {
    expect(shortestRotation(90, 0)).toBe(-90);
    expect(shortestRotation(180, 90)).toBe(-90);
  });

  it('handles 0/360 wraparound - prefers shorter path', () => {
    // From 350 to 10 should go +20, not -340
    expect(shortestRotation(350, 10)).toBe(20);
    
    // From 10 to 350 should go -20, not +340
    expect(shortestRotation(10, 350)).toBe(-20);
  });

  it('handles negative input angles', () => {
    // -10 normalizes to 350
    expect(shortestRotation(-10, 10)).toBe(20);
    expect(shortestRotation(10, -10)).toBe(-20);
  });

  it('handles angles > 360', () => {
    expect(shortestRotation(370, 380)).toBe(10); // 10 to 20
    expect(shortestRotation(720, 730)).toBe(10); // 0 to 10
  });

  it('handles exactly 180 degree difference', () => {
    // 180 is the boundary - should return positive or stay at 180
    const result = shortestRotation(0, 180);
    expect(Math.abs(result)).toBe(180);
  });

  it('handles common compass transitions', () => {
    // North to East
    expect(shortestRotation(0, 90)).toBe(90);
    // East to South
    expect(shortestRotation(90, 180)).toBe(90);
    // South to West
    expect(shortestRotation(180, 270)).toBe(90);
    // West to North (wraparound)
    expect(shortestRotation(270, 0)).toBe(90);
    // North to West (counter-clockwise is shorter)
    expect(shortestRotation(0, 270)).toBe(-90);
  });
});
