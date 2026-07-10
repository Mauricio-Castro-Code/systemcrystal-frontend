import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface ClientAddressFormDialogData {
  mode: 'create' | 'edit';
  addressLine?: string;
  neighborhood?: string;
  reference?: string;
}

export interface ClientAddressFormResult {
  addressLine: string;
  neighborhood: string;
  reference: string;
}

@Component({
  selector: 'app-client-address-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './client-address-form-dialog.html',
  styleUrl: './client-address-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAddressFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ClientAddressFormDialogComponent>);
  readonly data: ClientAddressFormDialogData = inject(MAT_DIALOG_DATA);

  readonly form = new FormGroup({
    addressLine: new FormControl(this.data.addressLine ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(220)],
    }),
    neighborhood: new FormControl(this.data.neighborhood ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(120)],
    }),
    reference: new FormControl(this.data.reference ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(220)],
    }),
  });

  confirm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.dialogRef.close({
      addressLine: v.addressLine.trim(),
      neighborhood: v.neighborhood.trim(),
      reference: v.reference.trim(),
    } satisfies ClientAddressFormResult);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
