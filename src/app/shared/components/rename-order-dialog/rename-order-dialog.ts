import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface RenameOrderDialogData {
  currentOrderId: string;
}

@Component({
  selector: 'app-rename-order-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './rename-order-dialog.html',
  styleUrl: './rename-order-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenameOrderDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RenameOrderDialogComponent>);
  readonly data: RenameOrderDialogData = inject(MAT_DIALOG_DATA);

  readonly folioControl = new FormControl(this.data.currentOrderId, {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(20)],
  });

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (this.folioControl.invalid) {
      this.folioControl.markAsTouched();
      return;
    }

    const newOrderId = this.folioControl.value.trim();

    if (!newOrderId) {
      return;
    }

    this.dialogRef.close(newOrderId);
  }
}
