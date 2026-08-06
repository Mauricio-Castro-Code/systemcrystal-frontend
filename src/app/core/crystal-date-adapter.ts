import { NativeDateAdapter } from '@angular/material/core';

/** NativeDateAdapter fija el primer dia de la semana en domingo (0); aqui lo movemos a lunes. */
export class CrystalDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }
}
