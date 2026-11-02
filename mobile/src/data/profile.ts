// Profil und Erststart im gespeicherten App-Zustand (Register COACH-001, UX-003, UX-010).

import { DEFAULT_MODULES } from '@/domain/modules';
import { EMPTY_PROFILE, type Profile } from '@/domain/profile';

import { readState, writeState } from './app-state';
import type { Db } from './db';

export async function loadProfile(db: Db): Promise<Profile> {
  const stored = await readState<Partial<Profile>>(db, 'profile', {});
  return { ...EMPTY_PROFILE, ...stored, units: { ...EMPTY_PROFILE.units, ...stored.units }, modules: { ...DEFAULT_MODULES, ...stored.modules } };
}

export async function saveProfile(db: Db, profile: Profile) {
  await writeState(db, 'profile', profile);
}

export const loadOnboardingDone = (db: Db) => readState<boolean>(db, 'onboarding_done', false);
export const saveOnboardingDone = (db: Db) => writeState(db, 'onboarding_done', true);
