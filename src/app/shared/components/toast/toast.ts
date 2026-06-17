import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  variant: ToastVariant;
  message: string;
  /** Texto opcional de acción (ej. "Deshacer"). */
  actionLabel?: string;
}

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
  warning: 'warning_amber',
};

@Component({
  selector: 'app-toast',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly data: ToastData = inject(MAT_SNACK_BAR_DATA);
  private readonly ref = inject(MatSnackBarRef<ToastComponent>);

  get icon(): string {
    return VARIANT_ICONS[this.data.variant];
  }

  dismiss(): void {
    this.ref.dismiss();
  }

  runAction(): void {
    this.ref.dismissWithAction();
  }
}
