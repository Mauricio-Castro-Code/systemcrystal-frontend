import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';

import { OrderRecord } from '../../models/order-record.model';
import {
  NOTE_FOLDER_OPTIONS,
  NoteFolderKey,
  NoteFolderOption,
} from '../../models/note-folder.model';
import {
  NOTE_SORT_OPTIONS,
  NoteSortKey,
} from '../../models/note-sort.model';
import { OrderRecordsService } from '../../../../core/services/order-records.service';

@Component({
  selector: 'app-order-records',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './order-records-page.html',
  styleUrl: './order-records-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderRecordsPageComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly orderRecordsService = inject(OrderRecordsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly folderOptions = NOTE_FOLDER_OPTIONS;
  readonly sortOptions = NOTE_SORT_OPTIONS;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = [
    'orderId',
    'clientName',
    'folders',
    'deliveryDate',
    'totalEstimated',
    'actions',
  ];
  readonly selectedFolder = signal<NoteFolderKey>('all');
  readonly selectedSort = signal<NoteSortKey>('id-desc');
  readonly searchTerm = signal('');
  readonly actionMessage = signal('');
  readonly isLoading = this.orderRecordsService.isLoading;
  readonly errorMessage = this.orderRecordsService.errorMessage;
  readonly dataSource = new MatTableDataSource<OrderRecord>([]);
  readonly filteredRecords = computed(() => {
    const records = this.orderRecordsService.orderRecords();
    const searchTerm = this.searchTerm();
    const selectedFolder = this.selectedFolder();

    const filteredRecords = records.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        record.orderId.toLowerCase().includes(searchTerm) ||
        record.clientName.toLowerCase().includes(searchTerm) ||
        record.folderLabels.some((folderLabel) =>
          folderLabel.toLowerCase().includes(searchTerm),
        );

      const matchesFolder =
        selectedFolder === 'all' || record.folderKeys.includes(selectedFolder);

      return matchesSearch && matchesFolder;
    });

    return this.sortRecords(filteredRecords, this.selectedSort());
  });
  readonly folderCards = computed(() =>
    this.folderOptions.map((option) => ({
      ...option,
      count: this.countRecordsForFolder(option),
    })),
  );

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredRecords();
      this.paginator?.firstPage();
    });

    this.searchControl.valueChanges
      .pipe(startWith(''), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value.trim().toLowerCase());
      });

    void this.orderRecordsService.loadOrders();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  async handleView(record: OrderRecord): Promise<void> {
    await this.router.navigate(['/pedidos', record.orderId]);
  }

  async handleEdit(record: OrderRecord): Promise<void> {
    await this.router.navigate(['/pedidos', record.orderId, 'editar']);
  }

  async handleDelete(record: OrderRecord): Promise<void> {
    const confirmed = await this.openDeleteConfirm(
      `Eliminar nota ${record.orderId}`,
      `¿Estás seguro de que deseas eliminar la nota de ${record.clientName}?`,
      'Esta acción no se puede deshacer.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.orderRecordsService.deleteOrder(record.orderId);
      this.actionMessage.set(`La nota ${record.orderId} fue eliminada correctamente.`);
    } catch (error) {
      this.actionMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar la nota seleccionada.',
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

  selectFolder(folderKey: NoteFolderKey): void {
    this.selectedFolder.set(folderKey);
  }

  selectSort(sortKey: NoteSortKey): void {
    this.selectedSort.set(sortKey);
  }

  trackFolderOption(index: number, option: NoteFolderOption): string {
    return `${index}-${option.key}`;
  }

  private countRecordsForFolder(option: NoteFolderOption): number {
    const records = this.orderRecordsService.orderRecords();

    if (option.key === 'all') {
      return records.length;
    }

    return records.filter((record) => record.folderKeys.includes(option.key)).length;
  }

  private sortRecords(records: OrderRecord[], sortKey: NoteSortKey): OrderRecord[] {
    return [...records].sort((firstRecord, secondRecord) => {
      switch (sortKey) {
        case 'id-asc':
          return this.resolveOrderSequence(firstRecord) - this.resolveOrderSequence(secondRecord);
        case 'delivery-asc':
          return this.resolveDeliveryTimestamp(firstRecord) - this.resolveDeliveryTimestamp(secondRecord);
        case 'delivery-desc':
          return this.resolveDeliveryTimestamp(secondRecord) - this.resolveDeliveryTimestamp(firstRecord);
        case 'id-desc':
        default:
          return this.resolveOrderSequence(secondRecord) - this.resolveOrderSequence(firstRecord);
      }
    });
  }

  private resolveOrderSequence(record: OrderRecord): number {
    const parts = record.orderId.split('-');
    const num  = Number.parseInt(parts[0]?.replace(/\D/g, '') || '0', 10);
    const year = Number.parseInt(parts[1]?.replace(/\D/g, '') || '0', 10);
    // year * 100_000 + num → 26*100000+1977=2601977 > 25*100000+2054=2502054
    return (Number.isFinite(year) ? year : 0) * 100_000 + (Number.isFinite(num) ? num : 0);
  }

  private resolveDeliveryTimestamp(record: OrderRecord): number {
    const deliveryDate = record.quotation.schedule.deliveryDate;

    if (!deliveryDate) {
      return Number.POSITIVE_INFINITY;
    }

    const parsedDate = Date.parse(deliveryDate);
    return Number.isFinite(parsedDate) ? parsedDate : Number.POSITIVE_INFINITY;
  }
}
