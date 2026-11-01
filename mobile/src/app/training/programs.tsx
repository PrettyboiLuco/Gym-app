import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { PROGRAMS } from '@/data/programs';
import { t } from '@/i18n';

/** Programm-Vorlagen (Ausbauplan A8.1): Vorschau und Übernahme über „Plan übernehmen“. */
export default function ProgramsScreen() {
  return (
    <Screen withHeader>
      <ThemedText type="small" themeColor="textSecondary">
        {t('programs.intro')}
      </ThemedText>
      {(['einsteiger', 'fortgeschritten'] as const).map((level) => (
        <Card key={level} title={t(`programs.level.${level}`)}>
          {PROGRAMS.filter((p) => p.level === level).map((p, i, all) => (
            <ListRow
              key={p.id}
              icon="dumbbell"
              title={p.file.name}
              subtitle={t('programs.meta', { days: p.file.days.length, perWeek: p.file.weekdays?.length ?? p.file.days.length })}
              accessory="›"
              last={i === all.length - 1}
              onPress={() => router.push({ pathname: '/training/import', params: { preset: p.id } })}
            />
          ))}
        </Card>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        {t('programs.hint')}
      </ThemedText>
    </Screen>
  );
}
