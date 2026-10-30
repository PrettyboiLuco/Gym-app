import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { EMPTY_PROFILE, type Profile } from '@/domain/profile';
import type { Units } from '@/domain/units';

import { loadOnboardingDone, loadProfile, saveOnboardingDone, saveProfile } from './profile';
import { useDb } from './store-provider';

type ProfileState = {
  loaded: boolean;
  profile: Profile;
  onboardingDone: boolean;
  updateProfile: (profile: Profile) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  /** Neu laden, z. B. nach Wiederherstellen einer Sicherung oder „Alle Daten löschen“. */
  reload: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

/** Profil und Einheiten für alle Bildschirme; einmal geladen, nach dem Speichern sofort überall aktuell. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const [state, setState] = useState({ loaded: false, profile: EMPTY_PROFILE, onboardingDone: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadProfile(db), loadOnboardingDone(db)]).then(([profile, onboardingDone]) => {
      if (!cancelled) setState({ loaded: true, profile, onboardingDone });
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const reload = useCallback(async () => {
    const [profile, onboardingDone] = await Promise.all([loadProfile(db), loadOnboardingDone(db)]);
    setState({ loaded: true, profile, onboardingDone });
  }, [db]);

  const updateProfile = useCallback(
    async (profile: Profile) => {
      await saveProfile(db, profile);
      setState((s) => ({ ...s, profile }));
    },
    [db]
  );

  const finishOnboarding = useCallback(async () => {
    await saveOnboardingDone(db);
    setState((s) => ({ ...s, onboardingDone: true }));
  }, [db]);

  return (
    <ProfileContext.Provider value={{ ...state, updateProfile, finishOnboarding, reload }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile outside ProfileProvider');
  return value;
}

export function useUnits(): Units {
  return useProfile().profile.units;
}
