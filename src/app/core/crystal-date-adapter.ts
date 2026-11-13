import { Injectable } from '@angular/core';
import { MAT_NATIVE_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

const DATE_INPUT_FORMAT = 'DD-MM-YYYY';

export const CRYSTAL_DATE_FORMATS = {
  ...MAT_NATIVE_DATE_FORMATS,
  parse: { dateInput: DATE_INPUT_FORMAT },
  display: { ...MAT_NATIVE_DATE_FORMATS.display, dateInput: DATE_INPUT_FORMAT },
};

@Injectable()
export class CrystalDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }

  override parse(value: unknown, _parseFormat?: unknown): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value !== 'string') return this.invalid();
    const text = value.trim();
    if (!text) return null;
    const local = /^(\d{1,2})([-/])(\d{1,2})\2(\d{2}|\d{4})$/.exec(text);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!local && !iso) return this.invalid();
    const day = Number(local ? local[1] : iso![3]);
    const month = Number(local ? local[3] : iso![2]);
    let year = Number(local ? local[4] : iso![1]);
    if (local?.[4].length === 2) year += year < 50 ? 2000 : 1900;
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return this.invalid();
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date : this.invalid();
  }

  override format(date: Date, displayFormat: object | string): string {
    if (displayFormat !== DATE_INPUT_FORMAT) return super.format(date, displayFormat);
    if (!this.isValid(date)) throw new Error('Fecha inválida.');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${String(date.getFullYear()).padStart(4, '0')}`;
  }
}
