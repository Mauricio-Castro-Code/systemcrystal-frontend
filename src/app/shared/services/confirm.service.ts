import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog';

/**
 * Abre el modal de confirmación de la marca y resuelve a `true` si el usuario
 * confirma. Reemplaza a `window.confirm` para tener avisos responsivos y con estilo.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  /** Confirmación genérica. Resuelve a `true` cuando el usuario acepta. */
  confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      data,
      autoFocus: false,
      panelClass: 'crystal-dialog',
    });

    return firstValueFrom(ref.afterClosed()).then((result: unknown) => result === true);
  }

  /** Confirmación destructiva (rojo + "Eliminar"). */
  confirmDelete(
    title: string,
    message: string,
    detail?: string,
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      detail,
      variant: 'danger',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
  }

  /** Confirmación de acción positiva (azul + etiqueta personalizable). */
  confirmAction(
    title: string,
    message: string,
    confirmLabel = 'Confirmar',
    detail?: string,
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      detail,
      variant: 'primary',
      confirmLabel,
      cancelLabel: 'Cancelar',
    });
  }
}
