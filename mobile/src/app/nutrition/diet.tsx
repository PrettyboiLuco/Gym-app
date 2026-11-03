import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { RadioList } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { dietPreview, loadDayTargets, saveTargetsSettings, type DayTargets } from '@/data/targets-settings';
import type { Macros } from '@/domain/coach';
import { DIET_RULES_VERSION, dietProfilesFor, showsNetCarbs, type DietProfile } from '@/domain/diet-profile';
import { useLoad } from '@/hooks/use-load';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatNumber, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { diaryToday } from '@/services/nutrition-format';

/** Ernährungsform als Makro-Voreinstellung (B2, W7). Low-Carb/Keto nicht bei sensibler Situation, Hinweis neutral. */
export default function DietScreen() {
  const db = useDb();
  const day = diaryToday();
  const { data, loaded } = useLoad((d) => loadDayTargets(d, day), null as DayTargets | null, day);
  const [draft, setDraft] = useState<DietProfile | null>(null);
  const [preview, setPreview] = useState<Macros | null>(null);
  const saved = data?.dietProfile ?? 'ausgewogen';
  const current = draft ?? saved;
  const allowLeave = useUnsavedGuard(draft !== null && draft !== saved);

  useEffect(() => {
    let cancelled = false;
    if (!data || data.hidden) return;
    dietPreview(db, day, current).then((m) => {
      if (!cancelled) setPreview(m);
    });
    return () => {
      cancelled = true;
    };
  }, [db, day, current, data]);

  if (!loaded || !data) return <Screen withHeader>{null}</Screen>;
  const options = dietProfilesFor(data.sensitive);

  async function save() {
    if (!data) return;
    await saveTargetsSettings(db, { ...data.settings, dietProfile: current });
    allowLeave();
    router.back();
  }

  return (
    <Screen withHeader>
      <Card>
        <RadioList
          label={t('targets.diet.label')}
          options={options}
          value={options.includes(current) ? current : 'ausgewogen'}
          onChange={setDraft}
          format={(p) => t(`targets.diet.option.${p}`)}
          describe={(p) => t(`targets.diet.text.${p}`)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('targets.diet.proteinNote')}
        </ThemedText>
        {data.sensitive ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.diet.sensitive')}
          </ThemedText>
        ) : null}
      </Card>

      {showsNetCarbs(current) && !data.sensitive ? (
        <Card>
          <ThemedText>{t('targets.diet.notice')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.diet.netCarbsHint')}
          </ThemedText>
        </Card>
      ) : null}

      {!data.hidden ? (
        <Card>
          <ThemedText>
            {preview
              ? t('targets.diet.preview', {
                  protein: formatNumber(preview.protein, 0),
                  fat: formatNumber(preview.fat, 0),
                  carbs: formatNumber(preview.carbs, 0),
                  fiber: formatNumber(preview.fiber, 0),
                })
              : t('targets.diet.noMacros')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.rulesVersion', { version: DIET_RULES_VERSION })}
          </ThemedText>
        </Card>
      ) : null}

      <Button label={t('common.save')} onPress={save} />
    </Screen>
  );
}
