import { Stack, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { LEARN_ARTICLES, LEARN_TOPICS, type LearnArticle } from '@/domain/learn';
import { t } from '@/i18n';

/** Ein Artikel der Lerninhalte. */
export default function LearnArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!(LEARN_ARTICLES as readonly string[]).includes(id)) return <Screen withHeader>{null}</Screen>;
  const article = id as LearnArticle;
  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: t(`learn.topics.${LEARN_TOPICS[article]}`) }} />
      <ThemedText type="subtitle" accessibilityRole="header">
        {t(`learn.articles.${article}.title`)}
      </ThemedText>
      <Card>
        {t(`learn.articles.${article}.body`)
          .split('\n\n')
          .map((p, i) => (
            <ThemedText key={i}>{p}</ThemedText>
          ))}
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        {t('learn.intro')}
      </ThemedText>
    </Screen>
  );
}
