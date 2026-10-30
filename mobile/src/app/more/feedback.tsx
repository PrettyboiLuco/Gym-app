import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice, Field, Presets, RadioList } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { loadFeedbackDraft, saveFeedbackDraft, usageSummary } from '@/data/feedback';
import { useDb } from '@/data/store-provider';
import { AREAS, EMPTY_FEEDBACK, feedbackText, isEmptyFeedback, PAY_OPTIONS, type FeedbackAnswers, type UsageSummary } from '@/domain/feedback';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Feedback für den Pilot (Register BUS-002, BUS-015, BUS-016, O7). Die App sendet nichts selbst:
 * Du siehst den Text vorher und teilst ihn über das Teilen-Menü (z. B. Mail oder Messenger).
 */
export default function FeedbackScreen() {
  const db = useDb();
  const theme = useTheme();
  const [answers, setAnswers] = useState<FeedbackAnswers>(EMPTY_FEEDBACK);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [withUsage, setWithUsage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFeedbackDraft(db), usageSummary(db)]).then(([draft, u]) => {
      if (cancelled) return;
      setAnswers(draft);
      setUsage(u);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  function change(c: Partial<FeedbackAnswers>) {
    const next = { ...answers, ...c };
    setAnswers(next);
    // Entwurf sofort speichern, damit nichts verloren geht.
    saveFeedbackDraft(db, next);
  }

  const text = feedbackText(
    answers,
    withUsage ? usage : null,
    { version: Constants.expoConfig?.version ?? '–', date: todayDay() },
    (key, vars) => t(key, vars)
  );

  async function share() {
    if (isEmptyFeedback(answers)) {
      setMessage(t('feedback.empty'));
      return;
    }
    setMessage(null);
    try {
      await Share.share({ message: text });
    } catch {
      setMessage(t('feedback.shareFailed'));
    }
  }

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="small">{t('feedback.intro')}</ThemedText>
      </Card>

      <Card title={t('feedback.usedTitle')}>
        <View style={styles.chips}>
          {AREAS.map((area) => {
            const selected = answers.used.includes(area);
            return (
              <Pressable
                key={area}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t(`feedback.area.${area}`)}
                onPress={() => change({ used: selected ? answers.used.filter((a) => a !== area) : [...answers.used, area] })}
                style={[styles.chip, { backgroundColor: selected ? theme.tint : theme.backgroundSelected }]}>
                <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
                  {t(`feedback.area.${area}`)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Field label={t('feedback.missing')} value={answers.missing} onChangeText={(missing) => change({ missing })} multiline />
        <Field label={t('feedback.annoying')} value={answers.annoying} onChangeText={(annoying) => change({ annoying })} multiline />
        <Field label={t('feedback.otherApps')} value={answers.otherApps} onChangeText={(otherApps) => change({ otherApps })} />
      </Card>

      <Card>
        <RadioList
          label={t('feedback.payTitle')}
          options={PAY_OPTIONS}
          value={answers.pay ?? ('' as never)}
          onChange={(pay) => change({ pay })}
          format={(p) => t(`feedback.pay.${p}`)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('feedback.recommend')}
        </ThemedText>
        <Presets
          label={t('feedback.recommend')}
          options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          value={answers.recommend ?? undefined}
          onChange={(recommend) => change({ recommend })}
          format={(n) => String(n)}
        />
      </Card>

      <Card title={t('feedback.usageTitle')}>
        <Choice
          label={t('feedback.withUsage')}
          options={['aus', 'an'] as const}
          value={withUsage ? 'an' : 'aus'}
          onChange={(v) => setWithUsage(v === 'an')}
          format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('feedback.usageHint')}
        </ThemedText>
      </Card>

      <Card title={t('feedback.previewTitle')}>
        <ThemedText type="small" selectable>
          {text}
        </ThemedText>
      </Card>
      {message ? <ThemedText style={{ color: theme.danger }}>{message}</ThemedText> : null}
      <Button label={t('feedback.share')} onPress={share} />
      <Button
        label={t('feedback.reset')}
        variant="danger"
        onPress={() => {
          setAnswers(EMPTY_FEEDBACK);
          saveFeedbackDraft(db, EMPTY_FEEDBACK);
        }}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t('feedback.testflight')}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
});
