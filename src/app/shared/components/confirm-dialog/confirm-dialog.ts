import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ConfirmDialogVariant = 'danger' | 'primary' | 'success' | 'warning';

export interface ConfirmDialogData {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual + semantic variant. Defaults to 'danger' (back-compat with `danger`). */
  variant?: ConfirmDialogVariant;
  /** Override the header icon. Defaults per variant. */
  icon?: string;
  /** @deprecated use `variant`. Kept for back-compat: false -> primary, true/undefined -> danger. */
  danger?: boolean;
}

const VARIANT_ICONS: Record<ConfirmDialogVariant, string> = {
  danger: 'delete_forever',
  primary: 'help_outline',
  success: 'check_circle',
  warning: 'warning_amber',
};

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);

  get variant(): ConfirmDialogVariant {
    if (this.data.variant) {
      return this.data.variant;
    }
    return this.data.danger === false ? 'primary' : 'danger';
  }

  get icon(): string {
    return this.data.icon ?? VARIANT_ICONS[this.variant];
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
