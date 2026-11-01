import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { Button, Card } from '@/components/card';
import { Choice } from '@/components/fields';
import { todayDay } from '@/domain/time';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { buildReport, periodFor, REPORT_WEEKS, reportHtml, reportSections, reportText, type Report, type ReportWeeks } from '@/data/report';
import { useDb } from '@/providers/store-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';

/** Bericht für Trainer/Arzt als PDF und Zusammenfassung zum Kopieren (Ausbauplan A5.5/A5.6). Ohne Bewertung. */
export default function ReportScreen() {
  const db = useDb();
  const theme = useTheme();
  const [weeks, setWeeks] = useState<ReportWeeks>('4');
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const { from, to } = periodFor(Number(weeks), todayDay());
    buildReport(db, from, to)
      .then((r) => alive && setReport(r))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [db, weeks]);

  async function sharePdf() {
    if (!report) return;
    setBusy(true);
    setError(false);
    try {
      const html = reportHtml(report, todayDay());
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('report.pdfDialog') });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!report) return;
    await Clipboard.setStringAsync(reportText(report));
    showToast(t('report.copied'));
  }

  return (
    <Screen withHeader>
      <Card title={t('report.cardTitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('report.cardText')}
        </ThemedText>
        <Choice label={t('report.weeks')} options={REPORT_WEEKS} value={weeks} onChange={setWeeks} format={(w) => t('report.weeksOption', { count: w })} chips />
        <Button label={t('report.pdf')} disabled={busy || !report} onPress={sharePdf} />
        <Button label={t('report.copy')} variant="secondary" disabled={!report} onPress={copy} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('report.copyHint')}
        </ThemedText>
      </Card>
      {error ? <ThemedText style={{ color: theme.danger }}>{t('report.failed')}</ThemedText> : null}
      {report ? (
        <Card title={t('report.period', { from: formatDay(report.from), to: formatDay(report.to) })}>
          {reportSections(report).map((sec) => (
            <ThemedText key={sec.title} type="small">
              <ThemedText type="smallBold">{sec.title}</ThemedText>
              {'\n'}
              {sec.lines.join('\n')}
            </ThemedText>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
