// Körpermaße (Register GOAL-004). Gespeichert in cm, angezeigt in der gewählten Einheit.

export const MEASURE_SITES = ['taille', 'huefte', 'brust', 'arm', 'oberschenkel'] as const;
export type MeasureSite = (typeof MEASURE_SITES)[number];

export type Measurement = { id: string; day: string; site: MeasureSite; cm: number };

/** Letzter und vorletzter Wert je Stelle (Liste absteigend nach Tag erwartet). */
export function latestBySite(list: Measurement[]) {
  const result: Partial<Record<MeasureSite, { latest: Measurement; previous: Measurement | null }>> = {};
  for (const m of list) {
    const entry = result[m.site];
    if (!entry) result[m.site] = { latest: m, previous: null };
    else if (!entry.previous) entry.previous = m;
  }
  return result;
}

// ------------------------------------------------------------------- Fortschrittsfotos (GOAL-008)

export const PHOTO_POSES = ['vorne', 'seite', 'hinten'] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

export type ProgressPhoto = { id: string; day: string; pose: PhotoPose; fileName: string };

/** Erstes und neuestes Foto derselben Ansicht für den Vergleich; braucht zwei verschiedene Fotos. */
export function comparePair(photos: ProgressPhoto[], pose: PhotoPose) {
  const same = photos.filter((p) => p.pose === pose).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  if (same.length < 2) return null;
  return { first: same[0], latest: same[same.length - 1] };
}
