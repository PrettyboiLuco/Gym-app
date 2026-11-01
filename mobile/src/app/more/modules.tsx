import { applyReminders } from '@/components/alerts';
import { Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { notificationPermission } from '@/data/notifications';
import { loadReminders } from '@/data/reminders';
import { MODULES, effectiveModules, type ModuleId } from '@/domain/modules';
import { t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { useDb } from '@/providers/store-provider';

/** Module ein-/ausschalten (Ausbauplan A11.1). Daten bleiben beim Ausschalten erhalten. */
export default function ModulesScreen() {
  const db = useDb();
  const { profile, updateProfile } = useProfile();

  async function toggle(id: ModuleId, on: boolean) {
    const modules = effectiveModules({ ...profile.modules, [id]: on, ...(id === 'ernaehrung' && on ? { coach: profile.modules.coach } : {}) });
    await updateProfile({ ...profile, modules });
    // Erinnerungen für ausgeschaltete Bereiche (Trinken, Morgen-Check) gleich mit anpassen
    if ((await notificationPermission(false)) === 'granted') await applyReminders(db, await loadReminders(db));
  }

  return (
    <Screen withHeader>
      <ThemedText type="small" themeColor="textSecondary">
        {t('modules.intro')}
      </ThemedText>
      {MODULES.map((id) => (
        <Card key={id} title={t(`modules.names.${id}`)}>
          <Choice
            label={t(`modules.names.${id}`)}
            options={['an', 'aus'] as const}
            value={profile.modules[id] ? 'an' : 'aus'}
            onChange={(v) => toggle(id, v === 'an')}
            format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t(`modules.hints.${id}`)}
          </ThemedText>
          {id === 'coach' && !profile.modules.ernaehrung ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('modules.coachNeedsNutrition')}
            </ThemedText>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
