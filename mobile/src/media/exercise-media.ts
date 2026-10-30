// Verzeichnis der Übungsbilder (Phase 9.1). Anleitung: docs/Anleitung_Uebungsbilder.md.
// Jedes Bild braucht einen Eintrag mit Herkunft; ein Test prüft das (MEDIA-013). Beispiel:
//
//   {
//     exerciseId: 'kniebeuge',
//     source: require('@/assets/exercises/kniebeuge.webp'),
//     kind: 'bild',
//     author: 'Luc',
//     license: 'eigenes Werk',
//     origin: 'eigenes Foto',
//     checkedAt: '2026-11-15',
//     movementReviewed: false,
//   },

import type { MediaEntry } from '@/domain/media';

export const EXERCISE_MEDIA: MediaEntry[] = [];
