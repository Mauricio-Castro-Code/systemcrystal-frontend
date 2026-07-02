import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ClientAddressHistoryItem } from '../../../features/clientes/models/client-profile.model';

export interface AddressPickerDialogData {
  clientName: string;
  addresses: ClientAddressHistoryItem[];
}

export type AddressPickerResult =
  | { kind: 'new' }
  | { kind: 'existing'; addressLine: string; neighborhood: string; reference: string; freight: number | null };

interface LocalAddress {
  addressLine: string;
  neighborhood: string;
  reference: string;
  freight: number | null;
  usageCount: number;
}

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

  readonly localAddresses = signal<LocalAddress[]>(
    this.data.addresses.map((a) => ({
      addressLine: a.addressLine || a.address,
      neighborhood: a.neighborhood,
      reference: a.reference,
      freight: a.freight,
      usageCount: a.usageCount,
    })),
  );

  readonly selectedIndex = signal<number | null>(this.data.addresses.length > 0 ? 0 : null);

  readonly editingIndex = signal<number | null>(null);
  readonly editLine = signal('');
  readonly editCol = signal('');
  readonly editRef = signal('');

  isSelected(index: number): boolean {
    return this.selectedIndex() === index;
  }

  isEditing(index: number): boolean {
    return this.editingIndex() === index;
  }

  selectExisting(index: number): void {
    if (this.editingIndex() !== null) return;
    this.selectedIndex.set(index);
  }

  selectNew(): void {
    if (this.editingIndex() !== null) return;
    this.selectedIndex.set(null);
  }

  startEdit(index: number, event: Event): void {
    event.stopPropagation();
    const addr = this.localAddresses()[index];
    this.editLine.set(addr.addressLine);
    this.editCol.set(addr.neighborhood);
    this.editRef.set(addr.reference);
    this.editingIndex.set(index);
    this.selectedIndex.set(index);
  }

  saveEdit(): void {
    const idx = this.editingIndex();
    if (idx === null) return;
    this.localAddresses.update((list) =>
      list.map((item, i) =>
        i === idx
          ? { ...item, addressLine: this.editLine().trim(), neighborhood: this.editCol().trim(), reference: this.editRef().trim() }
          : item,
      ),
    );
    this.editingIndex.set(null);
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
  }

  confirm(): void {
    const idx = this.selectedIndex();
    if (idx === null) {
      this.dialogRef.close({ kind: 'new' } satisfies AddressPickerResult);
      return;
    }
    const addr = this.localAddresses()[idx];
    this.dialogRef.close({
      kind: 'existing',
      addressLine: addr.addressLine,
      neighborhood: addr.neighborhood,
      reference: addr.reference,
      freight: addr.freight,
    } satisfies AddressPickerResult);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
