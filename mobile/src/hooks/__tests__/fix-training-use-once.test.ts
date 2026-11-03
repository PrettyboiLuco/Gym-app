// Doppeltipp-Sperre (useOnce): Promise sperrt bis zum Ende, synchrone Handler (Navigation) kurz.
import { describe, expect, test } from '@jest/globals';

import { runOnce } from '../use-once';

const gate = () => ({ running: false, until: 0 });

describe('Doppeltipp-Sperre', () => {
  test('synchroner Handler: zweiter Tipp innerhalb von 500 ms wird ignoriert, danach geht es wieder', () => {
    const g = gate();
    let pushes = 0;
    const push = () => {
      pushes++;
    };
    expect(runOnce(g, push, [], 1000)).toBe(true);
    expect(runOnce(g, push, [], 1200)).toBe(false);
    expect(runOnce(g, push, [], 1499)).toBe(false);
    expect(runOnce(g, push, [], 1500)).toBe(true);
    expect(pushes).toBe(2);
  });

  test('Promise: gesperrt bis zum Ende, auch länger als 500 ms', async () => {
    const g = gate();
    let finish: () => void = () => undefined;
    const save = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    expect(runOnce(g, save, [], 0)).toBe(true);
    expect(runOnce(g, save, [], 10_000)).toBe(false);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(runOnce(g, save, [], 10_001)).toBe(true);
  });

  test('ohne Handler passiert nichts', () => {
    expect(runOnce(gate(), undefined, [], 0)).toBe(false);
  });
});
