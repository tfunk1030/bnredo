import { clubData, ClubData } from '@/src/utils/clubs';

describe('clubData', () => {
  it('should have 15 clubs (Driver through LW)', () => {
    expect(clubData).toHaveLength(15);
  });

  it('should start with Driver and end with LW', () => {
    expect(clubData[0].name).toBe('Driver');
    expect(clubData[clubData.length - 1].name).toBe('LW');
  });

  it('should have decreasing carry distances (bag order)', () => {
    for (let i = 1; i < clubData.length; i++) {
      expect(clubData[i].carry).toBeLessThan(clubData[i - 1].carry);
    }
  });

  it('should have decreasing ball speeds (bag order)', () => {
    for (let i = 1; i < clubData.length; i++) {
      expect(clubData[i].ballSpeed).toBeLessThanOrEqual(clubData[i - 1].ballSpeed);
    }
  });

  it('should have generally increasing spin rates (shorter clubs spin more)', () => {
    // Overall trend: spin increases from driver to wedges
    expect(clubData[0].spinRate).toBeLessThan(clubData[clubData.length - 1].spinRate);
  });

  it('should have generally increasing launch angles (shorter clubs launch higher)', () => {
    expect(clubData[0].launchAngle).toBeLessThan(clubData[clubData.length - 1].launchAngle);
  });

  it('should have all positive values', () => {
    clubData.forEach((club) => {
      expect(club.ballSpeed).toBeGreaterThan(0);
      expect(club.launchAngle).toBeGreaterThan(0);
      expect(club.spinRate).toBeGreaterThan(0);
      expect(club.carry).toBeGreaterThan(0);
    });
  });

  it('should have unique names', () => {
    const names = clubData.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should have Driver carry near PGA Tour average (~282)', () => {
    const driver = clubData.find((c) => c.name === 'Driver');
    expect(driver).toBeDefined();
    expect(driver!.carry).toBe(282);
    expect(driver!.ballSpeed).toBe(171);
  });

  it('should have 7-Iron carry near PGA Tour average (~176)', () => {
    const sevenIron = clubData.find((c) => c.name === '7-Iron');
    expect(sevenIron).toBeDefined();
    expect(sevenIron!.carry).toBe(176);
  });

  it('each club should have all required properties', () => {
    clubData.forEach((club) => {
      expect(typeof club.name).toBe('string');
      expect(typeof club.ballSpeed).toBe('number');
      expect(typeof club.launchAngle).toBe('number');
      expect(typeof club.spinRate).toBe('number');
      expect(typeof club.carry).toBe('number');
    });
  });

  it('wedge gaps should be approximately 12 yards', () => {
    const pw = clubData.find((c) => c.name === 'PW')!;
    const gw = clubData.find((c) => c.name === 'GW')!;
    const sw = clubData.find((c) => c.name === 'SW')!;
    const lw = clubData.find((c) => c.name === 'LW')!;

    expect(pw.carry - gw.carry).toBe(12);
    expect(gw.carry - sw.carry).toBe(12);
    expect(sw.carry - lw.carry).toBe(12);
  });
});
