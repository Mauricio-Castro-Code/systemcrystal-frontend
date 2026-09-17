import { CommonModule } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { combineLatest, startWith } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { InventoryService } from '../../../../core/services/inventory.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  INVENTORY_CATEGORIES,
  InventoryCategory,
  InventoryItem,
  InventoryItemPayload,
} from '../../models/inventory-item.model';

type CategoryFilter = InventoryCategory | 'ALL';

interface InventoryTableFilter {
  search: string;
  category: CategoryFilter;
}

@Component({
  selector: 'app-inventory-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './inventory-page.html',
  styleUrl: './inventory-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPageComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly confirmService = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryFilterControl = new FormControl<CategoryFilter>('ALL', { nonNullable: true });
  readonly categories = INVENTORY_CATEGORIES;
  readonly inventoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['OTROS' as InventoryCategory, [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
  });
  readonly displayedColumns = ['name', 'category', 'quantity', 'unitPrice', 'actions'];
  readonly dataSource = new MatTableDataSource<InventoryItem>([]);
  readonly editingItemId = signal<number | null>(null);
  readonly actionMessage = signal('');
  readonly isSaving = signal(false);
  readonly isLoading = this.inventoryService.isLoading;
  readonly errorMessage = this.inventoryService.errorMessage;
  readonly totalItems = this.inventoryService.totalItems;

  constructor() {
    this.dataSource.filterPredicate = (item, filter) => {
      const { search, category } = JSON.parse(filter) as InventoryTableFilter;

      if (category !== 'ALL' && item.category !== category) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableValues = [
        item.name,
        String(item.quantity),
        String(item.unitPrice),
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(search),
      );
    };

    combineLatest([
      this.searchControl.valueChanges.pipe(startWith('')),
      this.categoryFilterControl.valueChanges.pipe(startWith(this.categoryFilterControl.value)),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([search, category]) => {
        const tableFilter: InventoryTableFilter = {
          search: search.trim().toLowerCase(),
          category,
        };
        this.dataSource.filter = JSON.stringify(tableFilter);
        this.paginator?.firstPage();
      });

    effect(() => {
      this.dataSource.data = this.inventoryService.items();
    });

    void this.reloadInventory();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  async reloadInventory(): Promise<void> {
    await this.inventoryService.loadInventory(true);
  }

  async submitForm(): Promise<void> {
    this.inventoryForm.markAllAsTouched();

    if (this.inventoryForm.invalid) {
      this.actionMessage.set(
        'Revisa nombre, cantidad disponible y precio unitario antes de guardar.',
      );
      return;
    }

    this.isSaving.set(true);
    this.actionMessage.set('');

    try {
      const payload = this.buildPayload();
      const editingItemId = this.editingItemId();

      if (editingItemId !== null) {
        const updatedItem = await this.inventoryService.updateItem(editingItemId, payload);
        this.notifications.success(`Producto actualizado: ${updatedItem.name}.`);
      } else {
        const createdItem = await this.inventoryService.createItem(payload);
        this.notifications.success(`Producto registrado: ${createdItem.name}.`);
      }

      this.resetForm();
    } catch (error) {
      this.notifications.error(this.resolveErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  startEdit(item: InventoryItem): void {
    this.editingItemId.set(item.id);
    this.inventoryForm.setValue({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
    this.actionMessage.set(`Editando ${item.name}.`);
  }

  cancelEdit(): void {
    this.resetForm();
    this.actionMessage.set('Edicion cancelada.');
  }

  async deleteItem(item: InventoryItem): Promise<void> {
    const confirmed = await this.confirmService.confirmDelete(
      'Eliminar producto',
      `¿Confirmas que deseas eliminar el producto ${item.name}?`,
      'Esta acción no se puede deshacer.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.inventoryService.deleteItem(item.id);

      if (this.editingItemId() === item.id) {
        this.resetForm();
      }

      this.notifications.success(`Producto eliminado: ${item.name}.`);
    } catch (error) {
      this.notifications.error(this.resolveErrorMessage(error));
    }
  }

  trackByProductId(_: number, item: InventoryItem): number {
    return item.id;
  }

  categoryLabel(category: InventoryCategory): string {
    return this.categories.find((option) => option.value === category)?.label ?? category;
  }

  private buildPayload(): InventoryItemPayload {
    const formValue = this.inventoryForm.getRawValue();

    return {
      name: String(formValue.name ?? '').trim(),
      category: formValue.category ?? 'OTROS',
      quantity: Number(formValue.quantity ?? 0),
      unitPrice: Number(formValue.unitPrice ?? 0),
    };
  }

  private resetForm(): void {
    this.editingItemId.set(null);
    this.inventoryForm.reset({
      name: '',
      category: 'OTROS',
      quantity: 0,
      unitPrice: 0,
    });
    this.inventoryForm.markAsPristine();
    this.inventoryForm.markAsUntouched();
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible completar la operacion del inventario.';
  }
}
