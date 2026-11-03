import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { LEARN_ARTICLES, LEARN_TOPICS } from '@/domain/learn';
import { t } from '@/i18n';

/** Erster Satz eines Artikels als Vorschau – sagt mehr als ein Symbol und eine Lesezeit, die überall gleich wäre. */
function teaser(body: string): string {
  const first = body.split('\n\n')[0].split(/(?<=[a-zäöüß)]{3}[.!?])\s(?=[A-ZÄÖÜ„])/)[0];
  return first.length > 110 ? `${first.slice(0, 107).trimEnd()} …` : first;
}

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
                title={t(`learn.articles.${id}.title`)}
                subtitle={teaser(t(`learn.articles.${id}.body`))}
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
