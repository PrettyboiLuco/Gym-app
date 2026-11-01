import type { Prep } from '@/domain/nutrition';
import { t } from '@/i18n';

/** „Name, roh (Marke)“ – Marke und Zubereitung unterscheiden gleichnamige Produkte (FOOD-011, FOOD-018). */
export function foodTitle(food: { name: string; brand: string | null; prep?: Prep | null }) {
  const prep = food.prep ? t(`nutrition.food.prep.${food.prep}`) : null;
  // Grundnahrungsmittel tragen den Zustand oft schon im Namen („Reis (roh)“, „Lachsfilet (gegart)“) – nicht doppelt.
  const named = prep && /\([^)]*\b(roh|gekocht|gegart|gebraten|gebacken)\b/i.test(food.name);
  const name = prep && !named ? `${food.name}, ${prep}` : food.name;
  return food.brand ? `${name} (${food.brand})` : name;
}
