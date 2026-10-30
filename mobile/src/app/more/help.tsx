import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Field } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { HELP_SECTIONS, searchHelp, type HelpQuestion } from '@/domain/help';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

const text = (id: HelpQuestion) => ({ q: t(`help.q.${id}.q`), a: t(`help.q.${id}.a`) });

/** Hilfe und häufige Fragen (Register UX-005): Fragen nach Bereich, Antwort auf Antippen, Suche ohne Internet. */
export default function HelpScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<HelpQuestion | null>(null);
  const hits = useMemo(() => new Set(searchHelp(query, text)), [query]);
  const searching = query.trim().length > 0;

  return (
    <Screen withHeader subtitle={t('help.subtitle')}>
      <Field
        label={t('help.search')}
        placeholder={t('help.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      {hits.size === 0 ? <ThemedText themeColor="textSecondary">{t('help.noResults')}</ThemedText> : null}
      {HELP_SECTIONS.map((section) => {
        const questions = section.questions.filter((id) => hits.has(id));
        if (questions.length === 0) return null;
        return (
          <Card key={section.id} title={t(`help.sections.${section.id}`)}>
            {questions.map((id) => {
              // Bei einer Suche sind alle Treffer aufgeklappt, sonst nur die angetippte Frage.
              const expanded = searching || open === id;
              return (
                <View key={id} style={[styles.item, { borderColor: theme.backgroundSelected }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityHint={expanded ? t('help.collapse') : t('help.expand')}
                    onPress={() => setOpen(open === id ? null : id)}
                    style={({ pressed }) => [styles.question, { opacity: pressed ? 0.6 : 1 }]}>
                    <ThemedText type="smallBold" style={styles.questionText}>
                      {text(id).q}
                    </ThemedText>
                    <ThemedText style={{ color: theme.tint }}>{expanded ? '−' : '+'}</ThemedText>
                  </Pressable>
                  {expanded ? <ThemedText themeColor="textSecondary">{text(id).a}</ThemedText> : null}
                </View>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two, gap: Spacing.one },
  question: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  questionText: { flex: 1 },
});
