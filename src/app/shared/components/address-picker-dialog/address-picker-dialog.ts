import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ClientAddressHistoryItem } from '../../../features/clientes/models/client-profile.model';

export interface AddressPickerDialogData {
  clientName: string;
  addresses: ClientAddressHistoryItem[];
}

// 'new' = capturar una dirección nueva en blanco; número = índice de la guardada.
export type AddressPickerResult = { kind: 'new' } | { kind: 'existing'; index: number };

@Component({
  selector: 'app-address-picker-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './address-picker-dialog.html',
  styleUrl: './address-picker-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPickerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AddressPickerDialogComponent>);
  readonly data: AddressPickerDialogData = inject(MAT_DIALOG_DATA);

  // Por defecto seleccionamos la dirección más reciente (la primera), o "nueva" si no hay.
  readonly selected = signal<AddressPickerResult>(
    this.data.addresses.length > 0 ? { kind: 'existing', index: 0 } : { kind: 'new' },
  );

  isSelected(result: AddressPickerResult): boolean {
    const current = this.selected();
    if (current.kind !== result.kind) {
      return false;
    }
    return current.kind === 'new' || current.index === (result as { index: number }).index;
  }

  selectExisting(index: number): void {
    this.selected.set({ kind: 'existing', index });
  }

  selectNew(): void {
    this.selected.set({ kind: 'new' });
  }

  confirm(): void {
    this.dialogRef.close(this.selected());
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
