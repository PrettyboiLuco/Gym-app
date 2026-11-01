// Lerninhalte (Ausbauplan A10.8): kurze Artikel zu Grundlagen. Die Texte stehen in i18n (learn.articles.<id>) und
// laufen damit durch die Prüfung auf falsche Versprechen (domain/claims.ts).

export const LEARN_ARTICLES = [
  'progression',
  'rir',
  'volumen',
  'technik',
  'deload',
  'eiweiss',
  'kalorienbilanz',
  'gewicht_schwankt',
  'schlaf',
  'cardio',
  'aufwaermen',
  'mythen',
] as const;
export type LearnArticle = (typeof LEARN_ARTICLES)[number];
export const LEARN_TOPICS: Record<LearnArticle, 'training' | 'ernaehrung' | 'erholung'> = {
  progression: 'training',
  rir: 'training',
  volumen: 'training',
  technik: 'training',
  deload: 'erholung',
  eiweiss: 'ernaehrung',
  kalorienbilanz: 'ernaehrung',
  gewicht_schwankt: 'ernaehrung',
  schlaf: 'erholung',
  cardio: 'training',
  aufwaermen: 'training',
  mythen: 'ernaehrung',
};
