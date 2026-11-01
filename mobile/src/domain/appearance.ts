// Darstellung (hell, dunkel, wie das System) – die Auswahl selbst, ohne React.

export const APPEARANCES = ['system', 'hell', 'dunkel'] as const;
export type AppearanceChoice = (typeof APPEARANCES)[number];
