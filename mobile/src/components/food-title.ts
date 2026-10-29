import type { Prep } from '@/domain/nutrition';
import { t } from '@/i18n';

/** „Name, roh (Marke)“ – Marke und Zubereitung unterscheiden gleichnamige Produkte (FOOD-011, FOOD-018). */
export function foodTitle(food: { name: string; brand: string | null; prep?: Prep | null }) {
  const name = food.prep ? `${food.name}, ${t(`nutrition.food.prep.${food.prep}`)}` : food.name;
  return food.brand ? `${name} (${food.brand})` : name;
}
