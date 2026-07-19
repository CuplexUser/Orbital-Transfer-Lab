import { describe, expect, it } from 'vitest';
import {
  MISSION_LIST,
  buildMissionPath,
  missionShipAt,
  missionSpeedPresetsDPerS,
  missionTotalDays,
  planetAngleAtDate,
} from './missions';

describe('mission paths', () => {
  it('every mission builds a time-monotone path covering all events', () => {
    for (const m of MISSION_LIST) {
      const path = buildMissionPath(m);
      expect(path.points.length).toBeGreaterThan(50);
      for (let i = 1; i < path.points.length; i++) {
        expect(path.points[i].tDays).toBeGreaterThanOrEqual(path.points[i - 1].tDays);
      }
      for (const e of path.events) {
        expect(e.tDays).toBeGreaterThanOrEqual(0);
        expect(e.tDays).toBeLessThanOrEqual(path.totalDays);
      }
      expect(path.points[0].rAu).toBeCloseTo(1, 1); // all four launch from Earth
    }
  });

  it('ship interpolation clamps at both ends', () => {
    const path = buildMissionPath(MISSION_LIST[0]);
    expect(missionShipAt(path, -10)).toEqual(path.points[0]);
    expect(missionShipAt(path, path.totalDays + 999)).toEqual(path.points[path.points.length - 1]);
    const mid = missionShipAt(path, path.totalDays / 2);
    expect(Number.isFinite(mid.xAu)).toBe(true);
  });

  it('planet angles at J2000 match their mean longitudes', () => {
    expect((planetAngleAtDate('earth', '2000-01-01') * 180) / Math.PI).toBeCloseTo(100.46, 0);
    expect((planetAngleAtDate('jupiter', '2000-01-01') * 180) / Math.PI).toBeCloseTo(34.4, 0);
  });

  it('speed presets pace every mission to a watchable duration', () => {
    for (const m of MISSION_LIST) {
      const total = missionTotalDays(m);
      const presets = missionSpeedPresetsDPerS(total);
      expect(presets.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < presets.length; i++) {
        expect(presets[i]).toBeGreaterThan(presets[i - 1]);
      }
      // The default (second) preset should play the whole mission in ~1-3 minutes.
      const playSeconds = total / presets[1];
      expect(playSeconds).toBeGreaterThan(45);
      expect(playSeconds).toBeLessThan(200);
    }
  });

  it('Voyager 2 sweeps prograde through the Grand Tour in order', () => {
    const v2 = MISSION_LIST.find((m) => m.id === 'voyager2')!;
    const path = buildMissionPath(v2);
    // Radius should be (weakly) increasing through the outbound tour.
    const rs = path.events.map((e) => Math.hypot(e.xAu, e.yAu));
    for (let i = 1; i < rs.length; i++) expect(rs[i]).toBeGreaterThan(rs[i - 1]);
  });
});
