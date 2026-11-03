import { router, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/card';
import { EntryRow, MultiChoice } from '@/components/fields';
import { Screen } from '@/components/screen';
import { TargetMicroBar } from '@/components/target-micro-bar';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import type { Db } from '@/data/db';
import { listDay } from '@/data/nutrition';
import { loadDayTargets, saveTargetsSettings } from '@/data/targets-settings';
import { MICRO_KEYS, MICRO_UNITS, parseMicros, sumMicros, type MicroKey } from '@/domain/basis-foods';
import { MAX_PINNED, MICRO_TARGETS_VERSION } from '@/domain/micro-targets';
import { useLoad } from '@/hooks/use-load';
import { formatNumber, t } from '@/i18n';
import { diaryToday } from '@/services/nutrition-format';

async function load(db: Db, day: string) {
  const [targets, events] = await Promise.all([loadDayTargets(db, day), listDay(db, day)]);
  return { targets, sums: sumMicros(events.filter((e) => e.kind === 'essen' || e.microsJson).map((e) => parseMicros(e.microsJson))) };
}

/** Vitamine und Mineralstoffe eines Tages mit Zielen (B2, W2): Balken, anheften, weiter zu Top-Quellen. */
export default function MicrosScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : diaryToday();
  const { data, reload, db } = useLoad((d) => load(d, day), null as Awaited<ReturnType<typeof load>> | null, day);
  if (!data) return <Screen withHeader>{null}</Screen>;
  const { targets, sums } = data;

  async function changePins(next: MicroKey[]) {
    if (next.length > MAX_PINNED) {
      showToast(t('targets.micros.pinFull'));
      return;
    }
    await saveTargetsSettings(db, { ...targets.settings, pinnedMicros: next });
    await reload();
  }

  const value = (k: MicroKey) => sums.values[k] ?? null;

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {t('targets.micros.onlyLogged')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('micros.openHint', { known: sums.known, total: sums.total })}
        </ThemedText>
      </Card>

      {targets.hidden ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.micros.hidden')}
          </ThemedText>
          {MICRO_KEYS.map((k, i) => (
            <EntryRow
              key={k}
              title={t(`micros.${k}`)}
              value={value(k) === null ? t('targets.micros.noData') : `${formatNumber(value(k)!, value(k)! < 10 ? 1 : 0)} ${MICRO_UNITS[k]}`}
              last={i === MICRO_KEYS.length - 1}
            />
          ))}
        </Card>
      ) : (
        <>
          <Card>
            {MICRO_KEYS.map((k) => (
              <TargetMicroBar
                key={k}
                name={t(`micros.${k}`)}
                value={value(k)}
                unit={MICRO_UNITS[k]}
                limits={targets.refs[k]}
                onPress={() => router.push({ pathname: '/nutrition/nutrient', params: { key: k, day } })}
              />
            ))}
          </Card>
          <Card>
            <MultiChoice
              label={t('targets.micros.pinned')}
              options={MICRO_KEYS}
              value={targets.pinned}
              onChange={changePins}
              format={(k) => t(`micros.${k}`)}
            />
          </Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('targets.micros.sources', { version: MICRO_TARGETS_VERSION })}
          </ThemedText>
        </>
      )}
    </Screen>
  );
}
