import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { startWith } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';

import { QuotationRecordsService } from '../../../../core/services/quotation-records.service';
import { FolioStrategyService } from '../../../../core/services/folio-strategy.service';
import { QuotationRecord } from '../../models/quotation-record.model';

@Component({
  selector: 'app-quotation-records-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
  ],
  templateUrl: './quotation-records-page.html',
  styleUrl: './quotation-records-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationRecordsPageComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly quotationRecordsService = inject(QuotationRecordsService);
  private readonly folioStrategyService = inject(FolioStrategyService);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = ['quotationId', 'clientName', 'date', 'actions'];
  readonly isLoading = this.quotationRecordsService.isLoading;
  readonly errorMessage = this.quotationRecordsService.errorMessage;
  readonly dataSource = new MatTableDataSource<QuotationRecord>([]);

  constructor() {
    this.dataSource.filterPredicate = (record, filter) => {
      const normalizedFilter = filter.trim().toLowerCase();
      return (
        record.quotationId.toLowerCase().includes(normalizedFilter) ||
        record.clientName.toLowerCase().includes(normalizedFilter)
      );
    };

    effect(() => {
      this.dataSource.data = this.quotationRecordsService.quotationRecords();
    });

    this.searchControl.valueChanges
      .pipe(startWith(''), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.dataSource.filter = value.trim().toLowerCase();
        this.paginator?.firstPage();
      });

    void this.quotationRecordsService.loadQuotations();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  async handleView(record: QuotationRecord): Promise<void> {
    await this.router.navigate(['/cotizaciones', record.quotationId]);
  }

  async handleEdit(record: QuotationRecord): Promise<void> {
    await this.router.navigate(['/cotizaciones', record.quotationId, 'editar']);
  }

  async handleConfirm(record: QuotationRecord): Promise<void> {
    const shouldConfirm = await this.confirmService.confirmAction(
      `Convertir en pedido`,
      `¿Confirmas que deseas convertir la cotización ${record.quotationId} de ${record.clientName} en pedido?`,
      'Convertir',
    );

    if (!shouldConfirm) {
      return;
    }

    const folioStrategy = await this.folioStrategyService.resolve();

    if (folioStrategy === null) {
      return;
    }

    try {
      const createdOrder = await this.quotationRecordsService.confirmDraftAsOrder(
        record.quotationId,
        folioStrategy,
      );

      if (!createdOrder) {
        this.notifications.error('No fue posible confirmar la cotización seleccionada.');
        return;
      }

      this.notifications.success(
        `Cotización ${record.quotationId} confirmada como pedido ${createdOrder.orderId}.`,
      );
    } catch (error) {
      this.notifications.error(
        error instanceof Error
          ? error.message
          : 'No fue posible confirmar la cotización seleccionada.',
      );
    }
  }

  async handleDelete(record: QuotationRecord): Promise<void> {
    const confirmed = await this.confirmService.confirmDelete(
      `Eliminar cotización ${record.quotationId}`,
      `¿Estás seguro de que deseas eliminar la cotización de ${record.clientName}?`,
      'Esta acción no se puede deshacer.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.quotationRecordsService.deleteDraft(record.quotationId);
      this.notifications.success(
        `Cotización ${record.quotationId} eliminada correctamente.`,
      );
    } catch (error) {
      this.notifications.error(
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar la cotización seleccionada.',
      );
    }
  }
}
