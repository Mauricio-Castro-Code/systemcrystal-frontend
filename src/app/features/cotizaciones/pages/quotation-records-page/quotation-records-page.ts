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
import { firstValueFrom, startWith } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';

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
  private readonly dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = ['quotationId', 'clientName', 'date', 'actions'];
  readonly actionMessage = signal('');
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
    const shouldConfirm = window.confirm(
      `Confirma que deseas convertir la cotizacion ${record.quotationId} en pedido.`,
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
        this.actionMessage.set('No fue posible confirmar la cotizacion seleccionada.');
        return;
      }

      this.actionMessage.set(
        `La cotizacion ${record.quotationId} se confirmo como pedido ${createdOrder.orderId} y el cliente quedo sincronizado en Clientes.`,
      );
    } catch (error) {
      this.actionMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible confirmar la cotizacion seleccionada.',
      );
    }
  }

  async handleDelete(record: QuotationRecord): Promise<void> {
    const confirmed = await this.openDeleteConfirm(
      `Eliminar cotización ${record.quotationId}`,
      `¿Estás seguro de que deseas eliminar la cotización de ${record.clientName}?`,
      'Esta acción no se puede deshacer.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.quotationRecordsService.deleteDraft(record.quotationId);
      this.actionMessage.set(
        `La cotizacion ${record.quotationId} fue eliminada correctamente.`,
      );
    } catch (error) {
      this.actionMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar la cotizacion seleccionada.',
      );
    }
  }

  private openDeleteConfirm(title: string, message: string, detail?: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title, message, detail },
      autoFocus: false,
    });

    return firstValueFrom(ref.afterClosed()).then((result: unknown) => result === true);
  }
}
