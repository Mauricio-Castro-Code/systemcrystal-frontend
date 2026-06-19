import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import {
  FolioChoiceDialogComponent,
  FolioChoiceResult,
} from '../../shared/components/folio-choice-dialog/folio-choice-dialog';
import { FolioSelection, OrderRecordsService } from './order-records.service';

@Injectable({
  providedIn: 'root',
})
export class FolioStrategyService {
  private readonly dialog = inject(MatDialog);
  private readonly orderRecordsService = inject(OrderRecordsService);

  /**
   * Resuelve el folio para una nueva nota.
   * - Si no hay huecos en la numeracion, devuelve 'fill' sin preguntar.
   * - Si hay huecos, abre un dialogo para que el usuario elija en cual colocarla.
   * - Devuelve `null` si el usuario cancela (no se debe guardar).
   */
  async resolve(): Promise<FolioSelection | null> {
    let options;

    try {
      options = await this.orderRecordsService.getFolioOptions();
    } catch {
      // Si no se pueden consultar las opciones, seguimos con el comportamiento
      // por defecto (rellenar el primer hueco) para no bloquear el guardado.
      return { strategy: 'fill', value: null };
    }

    if (!options.hasGap) {
      return { strategy: 'fill', value: null };
    }

    const ref = this.dialog.open(FolioChoiceDialogComponent, {
      width: '460px',
      data: {
        gaps: options.gaps,
        sequentialFolio: options.sequentialFolio,
      },
      autoFocus: false,
    });

    const choice = await firstValueFrom(ref.afterClosed());

    if (!choice) {
      return null;
    }

    const result = choice as FolioChoiceResult;
    return { strategy: result.strategy, value: result.value };
  }
}
