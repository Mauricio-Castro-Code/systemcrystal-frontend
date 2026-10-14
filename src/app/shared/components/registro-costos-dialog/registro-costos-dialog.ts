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
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { EXPENSE_CATEGORIES, ExpenseCategory, OrderRecord } from '../../../features/pedidos/models/order-record.model';
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
    MatSelectModule,
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

  readonly categories = EXPENSE_CATEGORIES;
  readonly categoryControl = new FormControl<ExpenseCategory | null>(null, Validators.required);
  readonly retainedDepositControl = new FormControl(Number(this.data.retainedDeposit ?? 0), {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(this.data.quotation.summary.securityDeposit)],
  });
  readonly isSavingDeposit = signal(false);
  readonly montoControl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0.01),
  ]);

  readonly isSaving = signal(false);
  readonly isDeleting = signal<number | null>(null);
  readonly isTogglingClose = signal(false);
  readonly errorMessage = signal('');

  readonly revenue = computed(() => {
    const record = this.record();
    return record.accountingRevenue ?? (record.totalEstimated - record.quotation.summary.securityDeposit
      - record.quotation.summary.discount + Number(record.retainedDeposit ?? 0));
  });
  readonly utility = computed(() => this.revenue() - this.record().totalExtraCosts);

  categoryLabel(category?: string): string {
    return this.categories.find(option => option.value === category)?.label ?? 'Sin clasificar';
  }

  async saveRetainedDeposit(): Promise<void> {
    this.retainedDepositControl.markAsTouched();
    if (this.retainedDepositControl.invalid || this.isSavingDeposit()) return;
    this.isSavingDeposit.set(true);
    this.errorMessage.set('');
    try {
      this.record.set(await this.orderRecordsService.updateRetainedDeposit(
        this.record().orderId, this.retainedDepositControl.value,
      ));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible guardar el depósito.');
    } finally {
      this.isSavingDeposit.set(false);
    }
  }

  async addCost(): Promise<void> {
    if (this.isSaving()) return;
    const categoria = this.categoryControl.value;
    const monto = this.montoControl.value;

    if (!categoria || this.montoControl.invalid) {
      this.categoryControl.markAsTouched();
      this.montoControl.markAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.orderRecordsService.addExtraCost(this.record().orderId, {
        categoria,
        concepto: this.categoryLabel(categoria),
        monto: monto!,
      });
      this.record.set(updated);
      this.categoryControl.reset();
      this.montoControl.reset();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible agregar el costo.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async categorizeCost(costId: number, category: ExpenseCategory): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMessage.set('');
    try {
      this.record.set(await this.orderRecordsService.categorizeExtraCost(this.record().orderId, costId, category));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cambiar la categoría.');
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
