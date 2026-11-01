import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { Choice, MultiChoice } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { useProfile } from '@/providers/profile-provider';
import { useDb } from '@/providers/store-provider';
import { loadEquipmentProfiles, saveActiveEquipmentProfile, saveEquipmentProfiles } from '@/data/training-stats';
import { EQUIPMENT, type Equipment } from '@/domain/exercises';
import type { EquipmentProfile } from '@/domain/training-stats';
import { t, tOptional } from '@/i18n';

/** Geräteprofile (A8.4): Studio, Zuhause, Hotel – Planassistent und „Gerät belegt“ nutzen das gewählte. */
export default function EquipmentScreen() {
  const db = useDb();
  const { profile } = useProfile();
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [activeId, setActiveId] = useState('studio');

  useEffect(() => {
    loadEquipmentProfiles(db, profile.equipment ?? [...EQUIPMENT]).then((r) => {
      setProfiles(r.profiles);
      setActiveId(r.activeId);
    });
  }, [db, profile.equipment]);

  const active = profiles.find((p) => p.id === activeId);
  if (!active) return <Screen withHeader>{null}</Screen>;

  async function choose(id: string) {
    setActiveId(id);
    await saveActiveEquipmentProfile(db, id);
    showToast(t('equipmentProfiles.switched', { name: tOptional(`equipmentProfiles.names.${id}`) ?? id }));
  }

  async function setEquipment(list: Equipment[]) {
    const next = profiles.map((p) => (p.id === activeId ? { ...p, equipment: list } : p));
    setProfiles(next);
    await saveEquipmentProfiles(db, next);
  }

  return (
    <Screen withHeader>
      <Card>
        <ThemedText type="small">{t('equipmentProfiles.intro')}</ThemedText>
        <Choice
          label={t('equipmentProfiles.active')}
          options={profiles.map((p) => p.id)}
          value={activeId}
          onChange={choose}
          format={(id) => tOptional(`equipmentProfiles.names.${id}`) ?? profiles.find((p) => p.id === id)?.name ?? id}
        />
      </Card>
      <Card title={t('equipmentProfiles.equipmentOf', { name: tOptional(`equipmentProfiles.names.${active.id}`) ?? active.name })}>
        <MultiChoice label={t('equipmentProfiles.available')} options={EQUIPMENT} value={active.equipment} onChange={setEquipment} format={(e) => t(`equipment.${e}`)} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('equipmentProfiles.bodyweight')}
        </ThemedText>
        <Button label={t('equipmentProfiles.toAssistant')} variant="secondary" onPress={() => router.push('/training/assistant')} />
      </Card>
    </Screen>
  );
}
