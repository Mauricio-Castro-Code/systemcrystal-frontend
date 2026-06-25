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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';

import { OrderOperationalStatus, OrderRecord } from '../../models/order-record.model';
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
import { AuthService } from '../../../../core/services/auth.service';
import { TeamService } from '../../../../core/services/team.service';
import {
  AssignDriverDialogComponent,
  AssignDriverDialogResult,
} from '../../../../shared/components/assign-driver-dialog/assign-driver-dialog';

@Component({
  selector: 'app-order-records',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatCheckboxModule,
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
  private readonly confirmService = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly teamService = inject(TeamService);
  private readonly dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild('importInput') importInput?: { nativeElement: HTMLInputElement };

  readonly isAdmin = this.authService.isAdmin;
  readonly canAssignDriver = this.authService.canAssignDriver;
  readonly isImporting = signal(false);

  readonly folderOptions = NOTE_FOLDER_OPTIONS;
  readonly sortOptions = NOTE_SORT_OPTIONS;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = [
    'select',
    'orderId',
    'clientName',
    'folders',
    'deliveryDate',
    'totalEstimated',
    'actions',
  ];
  readonly bulkStatusActions: ReadonlyArray<{
    status: OrderOperationalStatus;
    label: string;
    icon: string;
  }> = [
    { status: 'PROGRAMADA', label: 'Programada', icon: 'event' },
    { status: 'POR_RECOGER', label: 'En Ruta', icon: 'local_shipping' },
    { status: 'ENTREGADO', label: 'Entregado', icon: 'inventory_2' },
    { status: 'RECOGIDO', label: 'Recogido', icon: 'done_all' },
    { status: 'CLIENTE_ENTREGA', label: 'Cliente Entrega', icon: 'handshake' },
  ];
  readonly selectedFolder = signal<NoteFolderKey>('all');
  readonly selectedSort = signal<NoteSortKey>('id-desc');
  readonly searchTerm = signal('');
  readonly isLoading = this.orderRecordsService.isLoading;
  readonly errorMessage = this.orderRecordsService.errorMessage;
  readonly dataSource = new MatTableDataSource<OrderRecord>([]);
  readonly selectedOrderIds = signal<Set<string>>(new Set());
  readonly isCollecting = signal(false);
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
  readonly selectedCount = computed(() => this.selectedOrderIds().size);
  readonly allSelected = computed(() => {
    const visibleIds = this.filteredRecords().map((r) => r.orderId);
    const selectedIds = this.selectedOrderIds();
    return visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  });

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

    // force=true: al entrar/volver a la pantalla siempre revalidamos contra el
    // backend (muestra lo cacheado al instante y refresca en segundo plano).
    void this.orderRecordsService.loadOrders(true);

    if (this.authService.canAssignDriver()) {
      void this.teamService.loadMembers();
    }
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  triggerImport(): void {
    this.importInput?.nativeElement.click();
  }

  async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite reimportar el mismo archivo

    if (!file) {
      return;
    }

    this.isImporting.set(true);
    try {
      const imported = await this.orderRecordsService.importOrderFromExcel(file);
      this.notifications.success(
        `Nota ${imported.orderId} importada correctamente desde Excel.`,
      );
    } catch (error) {
      this.notifications.error(
        error instanceof Error
          ? error.message
          : 'No fue posible importar la nota desde el Excel.',
      );
    } finally {
      this.isImporting.set(false);
    }
  }

  async handleView(record: OrderRecord): Promise<void> {
    await this.router.navigate(['/pedidos', record.orderId]);
  }

  async handleEdit(record: OrderRecord): Promise<void> {
    await this.router.navigate(['/pedidos', record.orderId, 'editar']);
  }

  async handleDelete(record: OrderRecord): Promise<void> {
    const confirmed = await this.confirmService.confirmDelete(
      `Eliminar nota ${record.orderId}`,
      `¿Estás seguro de que deseas eliminar la nota de ${record.clientName}?`,
      'Esta acción no se puede deshacer.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.orderRecordsService.deleteOrder(record.orderId);
      this.notifications.success(`Nota ${record.orderId} eliminada correctamente.`);
    } catch (error) {
      this.notifications.error(
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar la nota seleccionada.',
      );
    }
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

  toggleSelectOrder(orderId: string): void {
    this.selectedOrderIds.update((selected) => {
      const newSelected = new Set(selected);
      if (newSelected.has(orderId)) {
        newSelected.delete(orderId);
      } else {
        newSelected.add(orderId);
      }
      return newSelected;
    });
  }

  toggleSelectAll(): void {
    const visibleIds = this.filteredRecords().map((r) => r.orderId);
    const isCurrentlyAllSelected = this.allSelected();

    if (isCurrentlyAllSelected) {
      this.selectedOrderIds.update((selected) => {
        const newSelected = new Set(selected);
        visibleIds.forEach((id) => newSelected.delete(id));
        return newSelected;
      });
    } else {
      this.selectedOrderIds.update((selected) => {
        const newSelected = new Set(selected);
        visibleIds.forEach((id) => newSelected.add(id));
        return newSelected;
      });
    }
  }

  isOrderSelected(orderId: string): boolean {
    return this.selectedOrderIds().has(orderId);
  }

  async handleBulkStatus(status: OrderOperationalStatus, label: string): Promise<void> {
    const selectedIds = Array.from(this.selectedOrderIds());

    if (selectedIds.length === 0) {
      return;
    }

    let comment = '';

    // Al marcar como Recogido se registra quién recogió (auditoría).
    if (status === 'RECOGIDO') {
      const personName = prompt(
        `Marcar ${selectedIds.length} nota${selectedIds.length > 1 ? 's' : ''} como Recogido.\n\n¿Quién las recogió?`,
        '',
      );

      if (!personName || !personName.trim()) {
        return;
      }

      comment = `Recogido por: ${personName.trim()}`;
    }

    this.isCollecting.set(true);
    try {
      await this.orderRecordsService.updateMultipleOrderStatuses(selectedIds, {
        operationalStatus: status,
        comment,
      });

      // Recargamos desde el backend para reflejar el estado real, las carpetas
      // recalculadas y el envío al archivo de las notas marcadas como Recogido.
      await this.orderRecordsService.loadOrders(true);

      this.selectedOrderIds.set(new Set());
      const plural = selectedIds.length > 1;
      this.notifications.success(
        `${selectedIds.length} nota${plural ? 's' : ''} marcada${plural ? 's' : ''} como ${label}.`,
      );
    } catch (error) {
      this.notifications.error(
        error instanceof Error
          ? error.message
          : `No fue posible marcar las notas como ${label}.`,
      );
    } finally {
      this.isCollecting.set(false);
    }
  }

  async handleBulkAssign(): Promise<void> {
    const selectedIds = new Set(this.selectedOrderIds());
    const selectedRecords = this.orderRecordsService
      .orderRecords()
      .filter((record) => selectedIds.has(record.orderId));

    if (selectedRecords.length === 0) {
      return;
    }

    const drivers = this.teamService
      .members()
      .filter((member) => member.role === 'chofer' && member.isActive)
      .map((member) => ({ id: Number(member.id), name: member.displayName }));

    if (drivers.length === 0) {
      this.notifications.error('No hay choferes activos. Crea uno en la sección Equipo.');
      return;
    }

    const dialogRef = this.dialog.open(AssignDriverDialogComponent, {
      width: '520px',
      autoFocus: false,
      data: {
        drivers,
        notes: selectedRecords.map((record) => ({
          orderId: record.orderId,
          clientName: record.clientName,
          address:
            [record.quotation.clientInfo.address, record.quotation.clientInfo.neighborhood]
              .filter((part) => part)
              .join(', ') || 'Domicilio pendiente',
          hasMapsUrl: !!record.mapsUrl,
        })),
      },
    });

    const result = (await firstValueFrom(dialogRef.afterClosed())) as AssignDriverDialogResult | null;

    if (!result) {
      return;
    }

    this.isCollecting.set(true);
    try {
      for (const record of selectedRecords) {
        const mapsUrl = result.links[record.orderId];
        await this.orderRecordsService.assignOrder(record.orderId, {
          driverId: result.driverId,
          // Solo enviamos mapsUrl si el admin capturó uno nuevo en el diálogo.
          ...(mapsUrl ? { mapsUrl } : {}),
        });
      }

      await this.orderRecordsService.loadOrders(true);
      this.selectedOrderIds.set(new Set());

      const driverName = drivers.find((driver) => driver.id === result.driverId)?.name ?? 'el chofer';
      const plural = selectedRecords.length > 1;
      this.notifications.success(
        `${selectedRecords.length} nota${plural ? 's' : ''} asignada${plural ? 's' : ''} a ${driverName}.`,
      );
    } catch (error) {
      this.notifications.error(
        error instanceof Error ? error.message : 'No fue posible asignar las notas.',
      );
    } finally {
      this.isCollecting.set(false);
    }
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
