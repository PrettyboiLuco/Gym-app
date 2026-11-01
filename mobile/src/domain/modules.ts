// Module ein-/ausschalten (Ausbauplan A11.1): Wer nur trainiert, blendet z. B. Ernährung und Coach aus. Daten bleiben
// beim Ausschalten erhalten; Tabs, „Heute“ und Erinnerungen passen sich an.

export const MODULES = ['ernaehrung', 'coach', 'routinen', 'bereitschaft'] as const;
export type ModuleId = (typeof MODULES)[number];
export type Modules = Record<ModuleId, boolean>;

export const DEFAULT_MODULES: Modules = { ernaehrung: true, coach: true, routinen: true, bereitschaft: true };

/** Der Coach rechnet mit Kalorien und Essen – ohne Ernährung ist er mit aus. */
export function effectiveModules(m: Partial<Modules> | undefined): Modules {
  const on = { ...DEFAULT_MODULES, ...m };
  return { ...on, coach: on.coach && on.ernaehrung };
}
