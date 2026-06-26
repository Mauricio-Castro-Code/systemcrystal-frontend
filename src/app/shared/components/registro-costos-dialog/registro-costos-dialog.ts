import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { OrderRecord } from '../../../features/pedidos/models/order-record.model';
import { OrderRecordsService } from '../../../core/services/order-records.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registro-costos-dialog',
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './registro-costos-dialog.html',
  styleUrl: './registro-costos-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroCostosDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RegistroCostosDialogComponent>);
  readonly data: OrderRecord = inject(MAT_DIALOG_DATA);
  private readonly orderRecordsService = inject(OrderRecordsService);
  readonly isAdmin = inject(AuthService).isAdmin;

  readonly record = signal<OrderRecord>(this.data);

  readonly conceptoControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });
  readonly montoControl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0.01),
  ]);

  readonly isSaving = signal(false);
  readonly isDeleting = signal<number | null>(null);
  readonly isTogglingClose = signal(false);
  readonly errorMessage = signal('');

  readonly utility = computed(
    () => this.record().totalEstimated - this.record().totalExtraCosts,
  );

  async addCost(): Promise<void> {
    const concepto = this.conceptoControl.value.trim();
    const monto = this.montoControl.value;

    if (!concepto || !monto || monto <= 0) {
      this.conceptoControl.markAsTouched();
      this.montoControl.markAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.orderRecordsService.addExtraCost(this.record().orderId, {
        concepto,
        monto,
      });
      this.record.set(updated);
      this.conceptoControl.reset();
      this.montoControl.reset();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible agregar el costo.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteCost(costId: number): Promise<void> {
    this.isDeleting.set(costId);
    this.errorMessage.set('');

    try {
      const updated = await this.orderRecordsService.deleteExtraCost(this.record().orderId, costId);
      this.record.set(updated);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible eliminar el costo.');
    } finally {
      this.isDeleting.set(null);
    }
  }

  async toggleClose(): Promise<void> {
    this.isTogglingClose.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.orderRecordsService.toggleCloseRegistro(this.record().orderId);
      this.record.set(updated);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible actualizar el registro.');
    } finally {
      this.isTogglingClose.set(false);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
