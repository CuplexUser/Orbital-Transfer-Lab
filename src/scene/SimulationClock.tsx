import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';

/** Advances sim time every frame; transiently, without React re-renders. */
export function SimulationClock() {
  useFrame((_, delta) => {
    const s = useStore.getState();
    if (!s.playing) return;
    // Clamp delta so a backgrounded tab doesn't jump the clock on return.
    s.advanceTime(Math.min(delta, 0.1) * s.timeScale);
  });
  return null;
}
