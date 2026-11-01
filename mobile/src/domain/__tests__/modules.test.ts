// A11.1: Module – Standard alle an, Coach braucht Ernährung.

import { expect, test } from '@jest/globals';

import { DEFAULT_MODULES, effectiveModules } from '../modules';

test('Standard: alles an; fehlende Angaben = an; ohne Ernährung kein Coach', () => {
  expect(effectiveModules(undefined)).toEqual(DEFAULT_MODULES);
  expect(effectiveModules({ routinen: false })).toEqual({ ...DEFAULT_MODULES, routinen: false });
  expect(effectiveModules({ ernaehrung: false })).toMatchObject({ ernaehrung: false, coach: false });
});
