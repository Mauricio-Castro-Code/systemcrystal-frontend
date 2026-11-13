import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { CrystalDateAdapter } from './crystal-date-adapter';

describe('Crystal date input', () => {
  let adapter: DateAdapter<Date>;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: DateAdapter, useClass: CrystalDateAdapter }] });
    adapter = TestBed.inject(DateAdapter<Date>);
  });

  it.each(['24-12-2026', '24-12-26', '24/12/2026', '24/12/26', '2026-12-24'])('reads %s as December 24 without swapping month/day', text => {
    const date = adapter.parse(text, null)!;
    expect(adapter.isValid(date)).toBe(true);
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 11, 24]);
  });

  it('reads ambiguous dates in day-month order and recognizes birth years', () => {
    const date = adapter.parse('05-04-26', null)!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 3, 5]);
    expect(adapter.parse('24-06-89', null)!.getFullYear()).toBe(1989);
  });

  it.each(['31-02-2026', '29-02-2026', '31-04-26', '00-12-26', '24-13-26', '12-24-26', '24-12-202', 'hello', '24-12/26'])('rejects impossible or malformed date %s', text => {
    expect(adapter.isValid(adapter.parse(text, null)!)).toBe(false);
  });

  it('formats typed dates consistently without changing accessible month labels', () => {
    expect(adapter.format(new Date(2026, 11, 24), 'DD-MM-YYYY')).toBe('24-12-2026');
    expect(adapter.format(new Date(2026, 11, 24), { month: 'long', year: 'numeric' })).toContain('2026');
  });

  it('accepts leap day, empty input and Date values without changing the calendar week', () => {
    expect(adapter.parse('29-02-2028', null)).toEqual(new Date(2028, 1, 29));
    expect(adapter.parse('', null)).toBeNull();
    expect(adapter.parse(new Date(2026, 11, 24), null)).toEqual(new Date(2026, 11, 24));
    expect(adapter.getFirstDayOfWeek()).toBe(1);
  });
});
