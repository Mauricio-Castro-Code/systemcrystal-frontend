import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface WhatsAppMessageDialogData {
  message: string;
}

@Component({
  selector: 'app-whatsapp-message-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './whatsapp-message-dialog.html',
  styleUrl: './whatsapp-message-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsAppMessageDialogComponent {
  readonly dialogRef = inject(MatDialogRef<WhatsAppMessageDialogComponent>);
  readonly data: WhatsAppMessageDialogData = inject(MAT_DIALOG_DATA);

  readonly messageControl = new FormControl(this.data.message, {
    nonNullable: true,
    validators: [Validators.required],
  });

  cancel(): void {
    this.dialogRef.close(null);
  }

  send(): void {
    const message = this.messageControl.value.trim();

    if (!message) {
      this.messageControl.markAsTouched();
      return;
    }

    this.dialogRef.close(message);
  }
}
