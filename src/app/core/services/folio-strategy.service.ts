import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import {
  FolioChoiceDialogComponent,
  FolioStrategy,
} from '../../shared/components/folio-choice-dialog/folio-choice-dialog';
import { OrderRecordsService } from './order-records.service';

@Injectable({
  providedIn: 'root',
})
export class FolioStrategyService {
  private readonly dialog = inject(MatDialog);
  private readonly orderRecordsService = inject(OrderRecordsService);

  /**
   * Resuelve la estrategia de folio para una nueva nota.
   * - Si no hay huecos en la numeracion, devuelve 'fill' sin preguntar.
   * - Si hay un hueco, abre un dialogo para que el usuario elija.
   * - Devuelve `null` si el usuario cancela (no se debe guardar).
   */
  async resolve(): Promise<FolioStrategy | null> {
    let options;

    try {
      options = await this.orderRecordsService.getFolioOptions();
    } catch {
      // Si no se pueden consultar las opciones, seguimos con el comportamiento
      // por defecto (rellenar hueco) para no bloquear el guardado.
      return 'fill';
    }

    if (!options.hasGap) {
      return 'fill';
    }

    const ref = this.dialog.open(FolioChoiceDialogComponent, {
      width: '440px',
      data: {
        fillFolio: options.fillFolio,
        sequentialFolio: options.sequentialFolio,
      },
      autoFocus: false,
    });

    const choice = await firstValueFrom(ref.afterClosed());
    return (choice as FolioStrategy | null | undefined) ?? null;
  }
}
