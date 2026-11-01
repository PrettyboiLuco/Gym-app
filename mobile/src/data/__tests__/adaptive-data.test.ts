// A7: Tag als unvollständig markieren (zählt nicht), Schätzung aus der Datenbank, Regelwahl.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { weeklyCheckin } from '@/domain/checkin';
import { shiftDay as shift } from '@/domain/dates';
import { EMPTY_PROFILE } from '@/domain/profile';

import { expenditure, loadCheckinRules, saveCheckinRules } from '../adaptive';
import { checkinInput } from '../coach';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { daySums, isDayIncomplete, logQuick, setDayIncomplete } from '../nutrition';
import { createTestDb } from '../testing/node-db';
import { addWeight } from '../weights';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const END = '2026-10-31';
const when = (day: string) => ({ diaryDate: day, at: new Date(`${day}T12:00:00Z`), timeZone: 'Europe/Berlin' });

describe('Adaptiver Energiebedarf', () => {
  test('markierter Tag zählt weder im Check-in noch in der Schätzung', async () => {
    for (let i = 0; i < 28; i++) {
      const day = shift(END, -i);
      await logQuick(db, { name: 'Tag', kcal: 2600, protein: null, carbs: null, fat: null }, 'mittag', when(day));
      await addWeight(db, day, 85);
    }
    let e = await expenditure(db, END);
    expect(e.estimate).toMatchObject({ kind: 'schaetzung', kcal: 2600, completeDays: 28 });

    await setDayIncomplete(db, END, true);
    expect(await isDayIncomplete(db, END)).toBe(true);
    expect((await daySums(db, END, END))[0].flagged).toBe(1);
    e = await expenditure(db, END);
    expect(e.estimate).toMatchObject({ completeDays: 27 });
    const week = weeklyCheckin(await checkinInput(db, END, EMPTY_PROFILE, 'Europe/Berlin'));
    expect(week.summary).toMatchObject({ completeDays: 6, incompleteDays: 1 });

    await setDayIncomplete(db, END, false);
    expect((await expenditure(db, END)).estimate).toMatchObject({ completeDays: 28 });
  });

  test('Regelwahl: Standard 1, wählbar 2', async () => {
    expect(await loadCheckinRules(db)).toBe(1);
    await saveCheckinRules(db, 2);
    expect(await loadCheckinRules(db)).toBe(2);
  });
});
