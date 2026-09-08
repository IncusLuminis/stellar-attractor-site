import rawConfig from "../config/cockpit.json";
import { parseCockpitConfig, type CockpitConfig } from "../src/cockpit/config";

export const config: CockpitConfig = parseCockpitConfig(rawConfig);

/** Deterministic requestAnimationFrame / clock for controller tests. */
export class FakeClock {
  t = 0;
  private cbs: Array<{ id: number; cb: (t: number) => void }> = [];
  private nextId = 1;

  raf = (cb: (t: number) => void): number => {
    const id = this.nextId++;
    this.cbs.push({ id, cb });
    return id;
  };

  caf = (id: number): void => {
    this.cbs = this.cbs.filter((c) => c.id !== id);
  };

  now = (): number => this.t;

  get scheduler() {
    return { raf: this.raf, caf: this.caf, now: this.now };
  }

  /** Advance time in fixed steps, flushing scheduled callbacks each step. */
  advance(totalMs: number, dt = 16): void {
    const end = this.t + totalMs;
    let guard = 0;
    while (this.t < end && guard++ < 100_000) {
      this.t = Math.min(end, this.t + dt);
      const batch = this.cbs;
      this.cbs = [];
      for (const c of batch) c.cb(this.t);
    }
  }
}
