import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

import { ToastComponent, ToastData, ToastVariant } from '../components/toast/toast';

interface ToastOptions {
  /** Duración en ms. `0` mantiene el toast hasta que el usuario lo cierre. */
  duration?: number;
  actionLabel?: string;
}

/**
 * Avisos tipo toast (no bloqueantes) para confirmaciones rápidas como
 * "Nota guardada" o "Producto eliminado". Para confirmaciones que requieren
 * decisión del usuario usa `ConfirmService`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, options: ToastOptions = {}): MatSnackBarRef<ToastComponent> {
    return this.open('success', message, options.duration ?? 4000, options.actionLabel);
  }

  error(message: string, options: ToastOptions = {}): MatSnackBarRef<ToastComponent> {
    // Los errores se quedan un poco más para que dé tiempo de leerlos.
    return this.open('error', message, options.duration ?? 6000, options.actionLabel);
  }

  info(message: string, options: ToastOptions = {}): MatSnackBarRef<ToastComponent> {
    return this.open('info', message, options.duration ?? 4000, options.actionLabel);
  }

  warning(message: string, options: ToastOptions = {}): MatSnackBarRef<ToastComponent> {
    return this.open('warning', message, options.duration ?? 5000, options.actionLabel);
  }

  private open(
    variant: ToastVariant,
    message: string,
    duration: number,
    actionLabel?: string,
  ): MatSnackBarRef<ToastComponent> {
    const data: ToastData = { variant, message, actionLabel };

    return this.snackBar.openFromComponent(ToastComponent, {
      data,
      duration: duration > 0 ? duration : undefined,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'crystal-toast-panel',
    });
  }
}
