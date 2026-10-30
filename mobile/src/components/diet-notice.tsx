import { ThemedText } from '@/components/themed-text';
import { dietCheck, type DietPrefs, type FoodFacts } from '@/domain/diet';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Hinweise zu Allergenen und Ernährungsweise eines Lebensmittels (COACH-009). Nie „allergenfrei“. */
export function DietNotice({ facts, prefs }: { facts: FoodFacts; prefs: DietPrefs }) {
  const theme = useTheme();
  if (prefs.allergies.length === 0 && prefs.diet === 'alles') return null;
  const check = dietCheck(facts, prefs);
  const list = (items: string[]) => items.map((a) => t(`diet.allergen.${a}`)).join(', ');
  const lines: { text: string; warn: boolean }[] = [];
  if (check.contains.length) lines.push({ text: t('diet.contains', { list: list(check.contains) }), warn: true });
  if (check.traces.length) lines.push({ text: t('diet.traces', { list: list(check.traces) }), warn: true });
  if (check.unknown) lines.push({ text: t('diet.unknown'), warn: false });
  else if (prefs.allergies.length > 0 && !check.contains.length && !check.traces.length) {
    lines.push({ text: t('diet.noneListed'), warn: false });
  }
  const diet = t(`diet.dietOption.${prefs.diet}`);
  if (check.dietConflict === 'ja') lines.push({ text: t('diet.dietConflict', { diet }), warn: true });
  if (check.dietConflict === 'unbekannt') lines.push({ text: t('diet.dietUnknown', { diet }), warn: false });
  return (
    <>
      {lines.map((line) => (
        <ThemedText key={line.text} type="small" style={line.warn ? { color: theme.danger } : undefined} themeColor={line.warn ? undefined : 'textSecondary'}>
          {line.warn ? `⚠ ${line.text}` : line.text}
        </ThemedText>
      ))}
    </>
  );
}
