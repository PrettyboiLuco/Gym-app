import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { LEARN_ARTICLES, LEARN_TOPICS } from '@/domain/learn';
import { t } from '@/i18n';

/** Lerninhalte (Ausbauplan A10.8): kurze Artikel nach Thema. */
export default function LearnScreen() {
  return (
    <Screen withHeader>
      <ThemedText type="small" themeColor="textSecondary">
        {t('learn.intro')}
      </ThemedText>
      {(['training', 'ernaehrung', 'erholung'] as const).map((topic) => {
        const list = LEARN_ARTICLES.filter((a) => LEARN_TOPICS[a] === topic);
        return (
          <Card key={topic} title={t(`learn.topics.${topic}`)}>
            {list.map((id, i) => (
              <ListRow
                key={id}
                icon="book"
                title={t(`learn.articles.${id}.title`)}
                value={t('learn.readMinutes', { count: Math.max(1, Math.round(t(`learn.articles.${id}.body`).split(/\s+/).length / 180)) })}
                accessory="›"
                last={i === list.length - 1}
                onPress={() => router.push({ pathname: '/more/learn/[id]', params: { id } })}
              />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
