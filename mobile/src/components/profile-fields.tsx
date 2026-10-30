import { Card } from '@/components/card';
import { Choice, Field, RadioList } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { ACTIVITY_KEYS, type ActivityLevel, type FormulaTerm } from '@/domain/energy';
import type { ProfileForm } from '@/domain/profile';
import { cmToUnit, parseDecimal, unitToCm, type LengthUnit, type WeightUnit } from '@/domain/units';
import { t } from '@/i18n';

type Change = (change: Partial<ProfileForm>) => void;

/** Einheiten-Auswahl. Beim Wechsel der Längeneinheit wird eine getippte Größe mit umgerechnet. */
export function UnitFields({ form, onChange }: { form: ProfileForm; onChange: Change }) {
  function changeLength(length: LengthUnit) {
    const value = parseDecimal(form.height, 1);
    const height =
      value === null || length === form.units.length
        ? form.height
        : String(Math.round(cmToUnit(unitToCm(value, form.units.length), length) * 10) / 10).replace('.', ',');
    onChange({ units: { ...form.units, length }, height });
  }
  return (
    <Card>
      <Choice
        label={t('profile.weightUnit')}
        options={['kg', 'lb'] as const}
        value={form.units.weight}
        onChange={(weight: WeightUnit) => onChange({ units: { ...form.units, weight } })}
        format={(u) => t(`units.weightLabel.${u}`)}
      />
      <Choice
        label={t('profile.lengthUnit')}
        options={['cm', 'in'] as const}
        value={form.units.length}
        onChange={changeLength}
        format={(u) => t(`units.lengthLabel.${u}`)}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t('profile.unitsHint')}
      </ThemedText>
    </Card>
  );
}

/** Angaben nur für den Kalorienrechner (alle freiwillig, COACH-001). */
export function CalculatorFields({ form, onChange }: { form: ProfileForm; onChange: Change }) {
  return (
    <>
      <Card>
        <Field
          label={t('profile.birth')}
          placeholder={t('profile.birthPlaceholder')}
          value={form.birth}
          onChangeText={(birth) => onChange({ birth })}
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label={t('profile.height', { unit: form.units.length })}
          value={form.height}
          onChangeText={(height) => onChange({ height })}
          keyboardType="decimal-pad"
        />
      </Card>
      <Card>
        <Choice
          label={t('profile.formula')}
          options={['+5', '-161', 'keine'] as const}
          value={form.formulaTerm}
          onChange={(formulaTerm: FormulaTerm | 'keine') => onChange({ formulaTerm })}
          format={(v) => t(`profile.formulaOption.${v}`)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('profile.formulaHint')}
        </ThemedText>
      </Card>
      <Card>
        <RadioList
          label={t('profile.activity')}
          options={[...ACTIVITY_KEYS, 'keine'] as readonly (ActivityLevel | 'keine')[]}
          value={form.activity}
          onChange={(activity) => onChange({ activity })}
          format={(v) => (v === 'keine' ? t('profile.activityNone') : t(`profile.activityOption.${v}`))}
          describe={(v) => (v === 'keine' ? '' : t(`profile.activityExample.${v}`))}
        />
        <Choice
          label={t('profile.sport')}
          options={['nein', 'ja'] as const}
          value={form.sport ? 'ja' : 'nein'}
          onChange={(v) => onChange({ sport: v === 'ja' })}
          format={(v) => (v === 'ja' ? t('onboarding.yes') : t('onboarding.no'))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('profile.activityHint')}
        </ThemedText>
      </Card>
    </>
  );
}
