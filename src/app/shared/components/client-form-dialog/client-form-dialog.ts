import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface ClientFormDialogData {
  mode: 'create' | 'edit';
  clientName?: string;
  phoneNumber?: string;
  email?: string;
}

export interface ClientFormResult {
  clientName: string;
  phoneNumber: string;
  email: string;
}

@Component({
  selector: 'app-client-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './client-form-dialog.html',
  styleUrl: './client-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ClientFormDialogComponent>);
  readonly data: ClientFormDialogData = inject(MAT_DIALOG_DATA);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    clientName: new FormControl(this.data.clientName ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    phoneNumber: new FormControl(this.data.phoneNumber ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(25)],
    }),
    email: new FormControl(this.data.email ?? '', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(254)],
    }),
  });

  confirm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.dialogRef.close({
      clientName: v.clientName.trim(),
      phoneNumber: v.phoneNumber.trim(),
      email: v.email.trim(),
    } satisfies ClientFormResult);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
