import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { combineLatest, startWith } from 'rxjs';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
  InventoryImportPreview,
  InventoryColor,
  InventoryGroupingPreview,
  COLOR_PRODUCT_FAMILIES,
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
    MatAutocompleteModule,
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
  readonly canManageInventory = inject(AuthService).isAdmin;
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
    highSeasonPrice: new FormControl<number | null>(null, Validators.min(0)),
    replacementCost: [0, [Validators.required, Validators.min(0)]],
  });
  readonly displayedColumns = computed(() => this.canManageInventory()
    ? ['name', 'category', 'quantity', 'unitPrice', 'highSeasonPrice', 'replacementCost', 'actions']
    : ['name', 'category', 'quantity', 'unitPrice', 'highSeasonPrice', 'replacementCost']);
  readonly dataSource = new MatTableDataSource<InventoryItem>([]);
  readonly editingItemId = signal<number | null>(null);
  readonly actionMessage = signal('');
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly isPreviewing = signal(false);
  readonly isImporting = signal(false);
  readonly importPreview = signal<InventoryImportPreview | null>(null);
  readonly importError = signal('');
  readonly importFileName = signal('');
  readonly canConfirmImport = computed(() => {
    const preview = this.importPreview();
    return this.canManageInventory() && !!preview?.canImport && !!preview.token &&
      preview.errors.length === 0 && preview.rows.every(row => row.errors.length === 0) &&
      (preview.colors ?? []).every(row => row.errors.length === 0) &&
      !this.isPreviewing() && !this.isImporting();
  });
  private importSelection = 0;
  readonly colorFamilies = COLOR_PRODUCT_FAMILIES;
  readonly colorItem = signal<InventoryItem | null>(null);
  readonly editingColorId = signal<number | null>(null);
  readonly isSavingColor = signal(false);
  readonly colorError = signal('');
  readonly legacyStockReviewed = new FormControl(false, { nonNullable: true });
  readonly colorForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    quantity: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });
  readonly groupingOpen = signal(false);
  readonly groupingMappings = new FormArray<ReturnType<InventoryPageComponent['createGroupingMapping']>>([]);
  readonly groupingForm = this.formBuilder.nonNullable.group({
    targetName: ['', Validators.required],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    highSeasonPrice: new FormControl<number | null>(null, Validators.min(0)),
    replacementCost: [0, [Validators.required, Validators.min(0)]],
    sourceMappings: this.groupingMappings,
  });
  readonly groupingPreview = signal<InventoryGroupingPreview | null>(null);
  readonly groupingError = signal('');
  readonly isGroupingPreviewing = signal(false);
  readonly isGrouping = signal(false);
  readonly canConfirmGrouping = computed(() => {
    const preview = this.groupingPreview();
    return this.canManageInventory() && !!preview?.canConfirm && !!preview.token &&
      preview.errors.length === 0 && !this.isGroupingPreviewing() && !this.isGrouping();
  });
  private groupingRevision = 0;

  readonly isLoading = this.inventoryService.isLoading;
  readonly errorMessage = this.inventoryService.errorMessage;
  readonly totalItems = this.inventoryService.totalItems;

  constructor() {
    this.inventoryForm.controls.name.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(name => {
      const quantity = this.inventoryForm.controls.quantity;
      if (this.isColorFamily(name)) quantity.disable({ emitEvent: false });
      else quantity.enable({ emitEvent: false });
    });
    this.colorForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.legacyStockReviewed.setValue(false));
    this.groupingForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.invalidateGrouping());

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
    if (!this.canManageInventory()) return;
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
    if (!this.canManageInventory()) return;
    this.editingItemId.set(item.id);
    this.inventoryForm.setValue({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      highSeasonPrice: item.highSeasonPrice ?? null,
      replacementCost: item.replacementCost ?? 0,
    });
    if (item.requiresColor || this.isColorFamily(item.name)) this.inventoryForm.controls.quantity.disable({ emitEvent: false });
    else this.inventoryForm.controls.quantity.enable({ emitEvent: false });
    this.actionMessage.set(`Editando ${item.name}.`);
  }

  cancelEdit(): void {
    this.resetForm();
    this.actionMessage.set('Edicion cancelada.');
  }

  async deleteItem(item: InventoryItem): Promise<void> {
    if (!this.canManageInventory()) return;
    const confirmed = await this.confirmService.confirmAction(
      'Desactivar producto',
      `¿Confirmas que deseas desactivar el producto ${item.name}?`,
      'Desactivar',
      'Dejará de aparecer en el catálogo activo. Las notas históricas se conservarán.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.inventoryService.deleteItem(item.id);

      if (this.editingItemId() === item.id) {
        this.resetForm();
      }

      if (this.colorItem()?.id === item.id) this.closeColors();
      this.invalidateGrouping();
      this.notifications.success(`Producto desactivado: ${item.name}.`);
    } catch (error) {
      this.notifications.error(this.resolveErrorMessage(error));
    }
  }

  isColorFamily(name: string): boolean {
    const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return this.colorFamilies.some(family => normalize(family) === normalize(name));
  }

  openColors(item: InventoryItem): void {
    if (!this.canManageInventory() || !item.requiresColor || this.isSavingColor()) return;
    this.colorItem.set(item);
    this.resetColorForm();
  }

  closeColors(): void {
    if (this.isSavingColor()) return;
    this.colorItem.set(null);
    this.resetColorForm();
  }

  editColor(color: InventoryColor): void {
    if (!this.canManageInventory() || this.isSavingColor()) return;
    this.editingColorId.set(color.id);
    this.colorForm.setValue({ name: color.name, quantity: color.quantity });
    this.colorError.set('');
  }

  resetColorForm(): void {
    this.editingColorId.set(null);
    this.colorForm.reset({ name: '', quantity: 0 });
    this.colorError.set('');
  }

  registeredColorQuantity(): number {
    return (this.colorItem()?.colors ?? []).reduce((total, color) => total + color.quantity, 0);
  }

  hasUnassignedStock(): boolean {
    const item = this.colorItem();
    return !!item && item.quantity !== this.registeredColorQuantity();
  }

  proposedColorQuantity(): number {
    const replaced = this.colorItem()?.colors?.find(color => color.id === this.editingColorId())?.quantity ?? 0;
    return this.registeredColorQuantity() - replaced + Number(this.colorForm.controls.quantity.value || 0);
  }

  async saveColor(): Promise<void> {
    const item = this.colorItem();
    if (!this.canManageInventory() || !item || this.isSavingColor()) return;
    this.colorForm.markAllAsTouched();
    if (this.colorForm.invalid) return;
    if (this.hasUnassignedStock() && !this.legacyStockReviewed.value) {
      this.colorError.set('Revisa las existencias sin color y confirma el nuevo total antes de guardar.');
      return;
    }
    this.isSavingColor.set(true);
    this.colorError.set('');
    try {
      const values = this.colorForm.getRawValue();
      const updated = await this.inventoryService.saveColor(item.id, this.editingColorId(), { name: values.name.trim(), quantity: Number(values.quantity) });
      this.colorItem.set(updated);
      if (this.editingItemId() === updated.id) this.inventoryForm.controls.quantity.setValue(updated.quantity);
      this.resetColorForm();
      this.invalidateGrouping();
      this.notifications.success('Color y existencias guardados.');
    } catch (error) {
      this.colorError.set(this.resolveErrorMessage(error));
    } finally {
      this.isSavingColor.set(false);
    }
  }

  createGroupingMapping(sourceId: number) {
    return this.formBuilder.nonNullable.group({ sourceId: [sourceId, Validators.required], color: ['', [Validators.required, Validators.pattern(/\S/)]] });
  }

  addGroupingSource(sourceId: number): void {
    if (!this.canManageInventory() || this.isGrouping() || !sourceId || this.groupingMappings.controls.some(row => row.controls.sourceId.value === sourceId)) return;
    this.groupingMappings.push(this.createGroupingMapping(sourceId));
  }

  removeGroupingSource(index: number): void {
    if (!this.canManageInventory() || this.isGrouping()) return;
    this.groupingMappings.removeAt(index);
  }

  groupingSource(sourceId: number): InventoryItem | undefined {
    return this.dataSource.data.find(item => item.id === sourceId);
  }

  groupingSourceSelected(sourceId: number): boolean {
    return this.groupingMappings.controls.some(row => row.controls.sourceId.value === sourceId);
  }

  invalidateGrouping(): void {
    ++this.groupingRevision;
    this.groupingPreview.set(null);
    this.groupingError.set('');
    this.isGroupingPreviewing.set(false);
  }

  cancelGrouping(): void {
    if (this.isGrouping()) return;
    this.invalidateGrouping();
    this.groupingOpen.set(false);
  }

  async previewGrouping(): Promise<void> {
    if (!this.canManageInventory() || this.isGrouping()) return;
    this.invalidateGrouping();
    this.groupingForm.markAllAsTouched();
    if (this.groupingForm.invalid || this.groupingMappings.length === 0) {
      this.groupingError.set('Selecciona la familia, los productos de origen y un color para cada producto. Revisa los precios.');
      return;
    }
    const revision = this.groupingRevision;
    this.isGroupingPreviewing.set(true);
    const values = this.groupingForm.getRawValue();
    try {
      const preview = await this.inventoryService.previewGrouping({ ...values, sourceMappings: values.sourceMappings.map(row => ({ sourceId: row.sourceId, color: row.color.trim() })) });
      if (revision === this.groupingRevision) this.groupingPreview.set(preview);
    } catch (error) {
      if (revision === this.groupingRevision) this.groupingError.set(this.resolveErrorMessage(error));
    } finally {
      if (revision === this.groupingRevision) this.isGroupingPreviewing.set(false);
    }
  }

  async confirmGrouping(): Promise<void> {
    if (!this.canConfirmGrouping()) return;
    const token = this.groupingPreview()!.token!;
    this.isGrouping.set(true);
    this.groupingForm.disable({ emitEvent: false });
    try {
      const result = await this.inventoryService.confirmGrouping(token);
      this.invalidateGrouping();
      this.groupingMappings.clear();
      this.groupingOpen.set(false);
      this.resetForm();
      this.closeColors();
      await this.reloadInventory();
      this.notifications.success(`Reorganización completada: ${result.grouped} productos agrupados.`);
    } catch (error) {
      this.groupingPreview.set(null);
      this.groupingError.set(this.resolveErrorMessage(error));
    } finally {
      this.isGrouping.set(false);
      this.groupingForm.enable({ emitEvent: false });
    }
  }

  async exportInventory(): Promise<void> {
    if (!this.canManageInventory() || this.isExporting()) return;
    this.isExporting.set(true);
    try {
      const file = await this.inventoryService.exportExcel();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventario-crystal.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.notifications.error(this.resolveErrorMessage(error));
    } finally {
      this.isExporting.set(false);
    }
  }

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.selectImportFile(input.files?.[0] ?? null);
    input.value = '';
  }

  async selectImportFile(file: File | null): Promise<void> {
    if (!this.canManageInventory() || this.isImporting()) return;
    const selection = ++this.importSelection;
    this.importPreview.set(null);
    this.importError.set('');
    this.importFileName.set(file?.name ?? '');
    this.isPreviewing.set(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.importError.set('Selecciona un archivo de Excel con extensión .xlsx.');
      return;
    }
    this.isPreviewing.set(true);
    try {
      const preview = await this.inventoryService.previewImport(file);
      if (selection === this.importSelection) this.importPreview.set(preview);
    } catch (error) {
      if (selection === this.importSelection) this.importError.set(this.resolveErrorMessage(error));
    } finally {
      if (selection === this.importSelection) this.isPreviewing.set(false);
    }
  }

  cancelImport(): void {
    if (this.isImporting()) return;
    ++this.importSelection;
    this.importPreview.set(null);
    this.importError.set('');
    this.importFileName.set('');
    this.isPreviewing.set(false);
  }

  async confirmImport(): Promise<void> {
    if (!this.canConfirmImport()) return;
    const token = this.importPreview()!.token!;
    this.isImporting.set(true);
    this.importError.set('');
    try {
      const result = await this.inventoryService.confirmImport(token);
      this.importPreview.set(null);
      this.importFileName.set('');
      this.notifications.success(`Importación completada: ${result.created} productos nuevos y ${result.updated} actualizados.`);
      await this.reloadInventory();
    } catch (error) {
      this.importPreview.set(null);
      this.importError.set(this.resolveErrorMessage(error));
    } finally {
      this.isImporting.set(false);
    }
  }

  trackByProductId(_: number, item: InventoryItem): number {
    return item.id;
  }

  async changeCategory(item: InventoryItem, category: InventoryCategory): Promise<void> {
    if (!this.canManageInventory()) return;
    if (category === item.category) {
      return;
    }

    try {
      await this.inventoryService.updateItem(item.id, {
        name: item.name,
        category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        highSeasonPrice: item.highSeasonPrice ?? null,
        replacementCost: item.replacementCost ?? 0,
      });
      this.notifications.success(`Categoria actualizada: ${item.name}.`);
    } catch (error) {
      this.notifications.error(this.resolveErrorMessage(error));
    }
  }

  categoryLabel(category: InventoryCategory): string {
    return this.categories.find((item) => item.value === category)?.label ?? category;
  }

  private buildPayload(): InventoryItemPayload {
    const formValue = this.inventoryForm.getRawValue();

    return {
      name: String(formValue.name ?? '').trim(),
      category: formValue.category ?? 'OTROS',
      quantity: Number(formValue.quantity ?? 0),
      unitPrice: Number(formValue.unitPrice ?? 0),
      highSeasonPrice: formValue.highSeasonPrice == null ? null : Number(formValue.highSeasonPrice),
      replacementCost: Number(formValue.replacementCost ?? 0),
    };
  }

  private resetForm(): void {
    this.editingItemId.set(null);
    this.inventoryForm.reset({
      name: '',
      category: 'OTROS',
      quantity: 0,
      unitPrice: 0,
      highSeasonPrice: null,
      replacementCost: 0,
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
