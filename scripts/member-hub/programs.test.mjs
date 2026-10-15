import assert from 'node:assert/strict';
import test from 'node:test';
import { yardSettingsSchema, holidaySettingsSchema, programSettings, formatWinnerMonth } from '../../lib/member-hub/programs.ts';
import { holidayPages, holidayDefaults, winnerHoliday, isHoliday } from '../../lib/member-hub/holidays.ts';

test('program settings preserve layout defaults and validate editable fields', () => {
  const yard = yardSettingsSchema.parse({}), holiday = holidaySettingsSchema.parse({});
  assert.equal(yard.pageTitle, 'Celebrate beautiful yards');
  assert.equal(yard.showPast, true); assert.equal(yard.criteria.length, 4);
  assert.equal(holiday.displayHoliday, 'christmas');
  assert.deepEqual(holiday.prizes, [75, 50, 25, 25]);
  assert.equal(holiday.mapImages.length, 4);
  assert.equal(holidaySettingsSchema.safeParse({ prizes: [-1, 1, 1, 1] }).success, false);
  assert.equal(yardSettingsSchema.safeParse({ pageTitle: '' }).success, false);
  assert.equal(holidaySettingsSchema.safeParse({ displayHoliday: 'unknown' }).success, false);
  assert.deepEqual(programSettings('yard', null), yard);
});
test('winner months remain correct in Central time for date-only values', () => {
  assert.equal(formatWinnerMonth('2026-10-01'), 'October 2026');
  assert.equal(formatWinnerMonth('2026-01-01'), 'January 2026');
  assert.equal(formatWinnerMonth(''), '');
});

test('holiday pages use separate configuration and routes while retaining legacy winner assignments', () => {
  assert.notEqual(holidayPages.halloween.id, holidayPages.christmas.id);
  for (const holiday of ['christmas', 'halloween']) {
    assert.equal(isHoliday(holiday), true);
    assert.ok(holidayPages[holiday].publicPath.endsWith(`/${holiday}`));
    assert.ok(holidayPages[holiday].adminPath.endsWith(`/${holiday}`));
    assert.equal(programSettings('holiday', holidayDefaults(holiday)).displayHoliday, holiday);
  }
  assert.equal(isHoliday('unknown'), false);
  for (const value of ['Halloween', ' halloween ', 'Halloween contest']) assert.equal(winnerHoliday(value), 'halloween');
  for (const value of ['christmas', 'Xmas', undefined]) assert.equal(winnerHoliday(value), 'christmas');
  assert.match(programSettings('holiday', holidayDefaults('halloween')).emptyTitle, /Halloween/);
});
