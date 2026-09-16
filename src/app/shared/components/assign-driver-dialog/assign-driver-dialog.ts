import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  PlaceAutocompleteInputComponent,
  PlaceSelection,
} from '../place-autocomplete-input/place-autocomplete-input';

export interface AssignDriverDialogNote {
  orderId: string;
  clientName: string;
  address: string;
  hasMapsUrl: boolean;
}

export interface AssignDriverDialogDriver {
  id: number;
  name: string;
}

export interface AssignDriverDialogData {
  notes: AssignDriverDialogNote[];
  drivers: AssignDriverDialogDriver[];
}

export interface AssignDriverDialogResult {
  driverId: number;
  // Links capturados por nota; las omitidas no aparecen.
  links: Record<string, string>;
}

@Component({
  selector: 'app-assign-driver-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PlaceAutocompleteInputComponent,
  ],
  templateUrl: './assign-driver-dialog.html',
  styleUrl: './assign-driver-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignDriverDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AssignDriverDialogComponent>);
  readonly data: AssignDriverDialogData = inject(MAT_DIALOG_DATA);

  readonly driverControl = new FormControl<number | null>(null);
  readonly driverTouched = signal(false);

  // Notas seleccionadas que aún no tienen ubicación: pediremos el link de cada una.
  readonly notesMissingLink = this.data.notes.filter((note) => !note.hasMapsUrl);

  // Un FormControl por nota sin link, para capturar el link de Maps (opcional).
  readonly linkControls = new Map<string, FormControl<string>>(
    this.notesMissingLink.map((note) => [
      note.orderId,
      new FormControl('', { nonNullable: true }),
    ]),
  );

  // Dirección confirmada por Google al elegir una sugerencia, para mostrarla como
  // retroalimentación ("✓ resolvió a...") en vez de solo dejar la URL en el input.
  readonly resolvedAddresses = signal<Record<string, string>>({});

  linkControl(orderId: string): FormControl<string> {
    return this.linkControls.get(orderId)!;
  }

  onPlaceSelected(orderId: string, selection: PlaceSelection): void {
    this.linkControl(orderId).setValue(selection.mapsUrl);
    this.resolvedAddresses.update((current) => ({
      ...current,
      [orderId]: selection.formattedAddress,
    }));
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    const driverId = this.driverControl.value;

    if (!driverId) {
      this.driverTouched.set(true);
      return;
    }

    const links: Record<string, string> = {};
    for (const [orderId, control] of this.linkControls) {
      const value = control.value.trim();
      if (value) {
        links[orderId] = value;
      }
    }

    this.dialogRef.close({ driverId, links } satisfies AssignDriverDialogResult);
  }
}
