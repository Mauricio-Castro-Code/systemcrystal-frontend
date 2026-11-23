import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { InventoryPageComponent } from './inventory-page';

describe('Inventory permissions', () => {
  const isAdmin = signal(false);
  const item = { id: 1, name: 'Silla', category: 'OTROS' as const, quantity: 10, unitPrice: 25 };
  const service = {
    items: signal([item]),
    isLoading: signal(false),
    errorMessage: signal(''),
    totalItems: signal(1),
    loadInventory: vi.fn().mockResolvedValue(undefined),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
    exportExcel: vi.fn(),
    saveColor: vi.fn(),
    previewGrouping: vi.fn(),
    confirmGrouping: vi.fn(),
  };
  const confirmDelete = vi.fn();
  const confirmAction = vi.fn();
  beforeEach(async () => {
    isAdmin.set(false);
    service.items.set([item]);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [InventoryPageComponent],
      providers: [
        { provide: AuthService, useValue: { isAdmin } },
        { provide: InventoryService, useValue: service },
        { provide: ConfirmService, useValue: { confirmDelete, confirmAction } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
  });
  it('keeps all products hidden until two search characters or a category are supplied', async () => {
    service.items.set([item, { ...item, id: 2, name: 'Mantel redondo', category: 'MANTELERIA' } as any]);
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(page.dataSource.filteredData).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Busca un equipo');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    page.searchControl.setValue('s');
    await fixture.whenStable();
    expect(page.dataSource.filteredData).toHaveLength(0);
    page.searchControl.setValue('si');
    await fixture.whenStable();
    expect(page.dataSource.filteredData.map(row => row.name)).toEqual(['Silla']);
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    page.categoryFilterControl.setValue('MANTELERIA');
    await fixture.whenStable();
    expect(page.dataSource.filteredData).toHaveLength(0);
    page.searchControl.setValue('');
    await fixture.whenStable();
    expect(page.dataSource.filteredData.map(row => row.name)).toEqual(['Mantel redondo']);
    page.categoryFilterControl.setValue('ALL');
    await fixture.whenStable();
    expect(page.dataSource.filteredData).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('attaches pagination when results first appear and restores the first page after filtering', async () => {
    service.items.set(Array.from({ length: 60 }, (_, index) => ({ ...item, id: index + 1, name: `Silla ${index + 1}` })));
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.searchControl.setValue('silla');
    await fixture.whenStable();
    expect(page.dataSource.paginator).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(20);
    page.dataSource.paginator!.nextPage();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tr.mat-mdc-row').textContent).toContain('Silla 21');
    page.searchControl.setValue('silla 60');
    await fixture.whenStable();
    expect(page.dataSource.paginator!.pageIndex).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(1);
    page.clearFilters();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('adds through a modal, prevents closing while saving and reveals the saved product', async () => {
    isAdmin.set(true);
    let finish!: (item: unknown) => void;
    service.createItem.mockReturnValueOnce(new Promise(resolve => finish = resolve));
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const add: HTMLButtonElement = Array.from(fixture.nativeElement.querySelectorAll('.inventory-page__admin-actions button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('Agregar')) as HTMLButtonElement;
    add.click();
    await fixture.whenStable();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('input[formControlName="name"]')).not.toBeNull();
    page.inventoryForm.patchValue({ name: 'Mesa', category: 'MOBILIARIO', quantity: 4, unitPrice: 100 });
    const pending = page.submitForm();
    expect(TestBed.inject(MatDialog).openDialogs[0].disableClose).toBe(true);
    page.closeItemDialog();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    finish({ id: 2, name: 'Mesa', category: 'MOBILIARIO', quantity: 4, unitPrice: 100 });
    await pending;
    await closed;
    await fixture.whenStable();
    expect(service.createItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mesa', quantity: 4 }));
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
    expect(page.searchControl.value).toBe('Mesa');
    expect(page.categoryFilterControl.value).toBe('MOBILIARIO');
    expect(page.editingItemId()).toBeNull();
  });

  it('cancels editing without writing and clears data before opening Add', async () => {
    isAdmin.set(true);
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.startEdit(item);
    await fixture.whenStable();
    expect(TestBed.inject(OverlayContainer).getContainerElement().textContent).toContain('Editar producto');
    expect(page.inventoryForm.controls.name.value).toBe('Silla');
    page.inventoryForm.controls.name.setValue('Sin guardar');
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    page.closeItemDialog();
    await closed;
    await fixture.whenStable();
    page.openAddDialog();
    await fixture.whenStable();
    expect(page.inventoryForm.controls.name.value).toBe('');
    expect(page.editingItemId()).toBeNull();
    expect(service.updateItem).not.toHaveBeenCalled();
    expect(service.createItem).not.toHaveBeenCalled();
  });

  it('ignores a pending file preview when its modal is closed and reopened', async () => {
    isAdmin.set(true);
    let finish!: (value: unknown) => void;
    service.previewImport.mockReturnValueOnce(new Promise(resolve => finish = resolve));
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.openImportDialog();
    const pending = page.selectImportFile(new File(['xlsx'], 'old.xlsx'));
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    page.closeImportDialog();
    await closed;
    await fixture.whenStable();
    page.openImportDialog();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    finish({ rows: [], errors: [], createCount: 1, updateCount: 0, canImport: true, token: 'old' });
    await pending;
    await fixture.whenStable();
    expect(page.importPreview()).toBeNull();
    expect(page.importFileName()).toBe('');
    expect(page.canConfirmImport()).toBe(false);
    expect(service.confirmImport).not.toHaveBeenCalled();
  });

  it('invalidates an import token immediately when the dialog is dismissed externally', async () => {
    isAdmin.set(true);
    service.previewImport.mockResolvedValueOnce({ rows: [], errors: [], createCount: 1, updateCount: 0, canImport: true, token: 'ready' });
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.openImportDialog();
    await page.selectImportFile(new File(['xlsx'], 'inventory.xlsx'));
    expect(page.canConfirmImport()).toBe(true);
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    const closed = firstValueFrom(ref.afterClosed());
    ref.close();
    expect(page.canConfirmImport()).toBe(false);
    await closed;
  });

  it('shows read-only inventory to office users and prevents mutations', async () => {
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.inventory-card--form')).toBeNull();
    expect(root.querySelector('[aria-label="Editar producto"]')).toBeNull();
    expect(root.querySelector('[aria-label="Desactivar producto"]')).toBeNull();
    expect(root.querySelector('.category-select')).toBeNull();
    expect(root.textContent).not.toContain('Silla');
    fixture.componentInstance.searchControl.setValue('si');
    await fixture.whenStable();
    expect(root.textContent).toContain('Silla');
    await fixture.componentInstance.deleteItem(item);
    await fixture.componentInstance.submitForm();
    await fixture.componentInstance.changeCategory(item, 'OTROS');
    fixture.componentInstance.startEdit(item);
    expect(confirmDelete).not.toHaveBeenCalled();
    expect(service.createItem).not.toHaveBeenCalled();
    expect(service.updateItem).not.toHaveBeenCalled();
    expect(service.deleteItem).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editingItemId()).toBeNull();
  });
  it('keeps management controls visible to administrators', async () => {
    isAdmin.set(true);
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.inventory-card--form')).toBeNull();
    expect(root.querySelectorAll('.inventory-page__admin-actions button')).toHaveLength(3);
    fixture.componentInstance.searchControl.setValue('si');
    await fixture.whenStable();
    expect(root.querySelector('[aria-label="Acciones de Silla"]')).not.toBeNull();
    fixture.componentInstance.openAddDialog();
    await fixture.whenStable();
    expect(TestBed.inject(OverlayContainer).getContainerElement().textContent).toContain('Agregar producto');
  });
  it('preserves seasonal and replacement prices when changing category', async () => {
    isAdmin.set(true);
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.componentInstance.changeCategory({ ...item, highSeasonPrice: 0, replacementCost: 350 } as any, 'VAJILLA');
    expect(service.updateItem).toHaveBeenCalledWith(1, expect.objectContaining({ highSeasonPrice: 0, replacementCost: 350 }));
  });
  it('edits and validates optional high-season price and replacement cost', () => {
    isAdmin.set(true);
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance;
    component.startEdit({ ...item, highSeasonPrice: 0, replacementCost: 350 } as any);
    expect(component.inventoryForm.getRawValue()).toMatchObject({ highSeasonPrice: 0, replacementCost: 350 });
    component.inventoryForm.get('replacementCost')?.setValue(-1 as never);
    expect(component.inventoryForm.invalid).toBe(true);
  });
  it('invalidates a previous preview immediately and ignores stale responses', async () => {
    isAdmin.set(true);
    let resolveFirst!: (value: unknown) => void;
    service.previewImport.mockReturnValueOnce(new Promise(resolve => resolveFirst = resolve));
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    const pending = component.selectImportFile(new File(['a'], 'first.xlsx'));
    await component.selectImportFile(new File(['b'], 'invalid.csv'));
    resolveFirst({ rows: [], errors: [], createCount: 1, updateCount: 0, canImport: true, token: 'old' });
    await pending;
    expect(component.importPreview()).toBeNull();
    expect(component.importError()).toContain('.xlsx');
    await component.confirmImport();
    expect(service.confirmImport).not.toHaveBeenCalled();
  });
  it('requires a valid preview before confirmation and reloads after importing', async () => {
    isAdmin.set(true);
    service.previewImport.mockResolvedValue({ rows: [], errors: [], createCount: 1, updateCount: 2, canImport: true, token: 'preview-token' });
    service.confirmImport.mockResolvedValue({ created: 1, updated: 2 });
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    await component.selectImportFile(new File(['a'], 'inventory.xlsx'));
    expect(service.confirmImport).not.toHaveBeenCalled();
    await component.confirmImport();
    expect(service.confirmImport).toHaveBeenCalledWith('preview-token');
    expect(service.loadInventory).toHaveBeenCalledWith(true);
    expect(component.importPreview()).toBeNull();
  });
  it('blocks import and export methods for office users', async () => {
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    await component.selectImportFile(new File(['a'], 'inventory.xlsx'));
    await component.confirmImport();
    await component.exportInventory();
    expect(service.previewImport).not.toHaveBeenCalled();
    expect(service.confirmImport).not.toHaveBeenCalled();
    expect(service.exportExcel).not.toHaveBeenCalled();
  });

  it('shows row errors and blocks a preview with validation failures', async () => {
    isAdmin.set(true);
    service.previewImport.mockResolvedValue({
      rows: [{ rowNumber: 3, action: 'create', name: 'Mesa', category: 'OTROS', quantity: -1, unitPrice: 50, highSeasonPrice: null, replacementCost: 0, errors: ['La cantidad debe ser mayor o igual a cero.'] }],
      errors: [], createCount: 0, updateCount: 0, canImport: false, token: null,
    });
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    fixture.componentInstance.openImportDialog();
    await fixture.componentInstance.selectImportFile(new File(['xlsx'], 'inventory.xlsx'));
    await fixture.whenStable();
    const root: HTMLElement = TestBed.inject(OverlayContainer).getContainerElement();
    expect(root.textContent).toContain('La cantidad debe ser mayor o igual a cero.');
    expect(root.textContent).toContain('Mesa');
    const confirm = Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('Confirmar importación'))!;
    expect(confirm.disabled).toBe(true);
    await fixture.componentInstance.confirmImport();
    expect(service.confirmImport).not.toHaveBeenCalled();
  });
  it('clears a valid preview after a failed replacement file', async () => {
    isAdmin.set(true);
    service.previewImport.mockResolvedValueOnce({ rows: [], errors: [], createCount: 1, updateCount: 0, canImport: true, token: 'valid' });
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance;
    await component.selectImportFile(new File(['xlsx'], 'inventory.xlsx'));
    service.previewImport.mockRejectedValueOnce(new Error('Archivo no válido.'));
    await component.selectImportFile(new File(['broken'], 'broken.xlsx'));
    expect(component.importPreview()).toBeNull();
    expect(component.importError()).toBe('Archivo no válido.');
    expect(component.canConfirmImport()).toBe(false);
  });

  it('derives family stock from registered colors and saves a color independently', async () => {
    isAdmin.set(true);
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    const family = { ...item, name: 'Bandas', requiresColor: true, colors: [{ id: 5, name: 'Azul', quantity: 10 }] };
    component.startEdit(family);
    expect(component.inventoryForm.controls.quantity.disabled).toBe(true);
    component.openColors(family);
    component.editColor(family.colors[0]);
    component.colorForm.patchValue({ quantity: 12 });
    service.saveColor.mockResolvedValue({ ...family, quantity: 12, colors: [{ id: 5, name: 'Azul', quantity: 12 }] });
    await component.saveColor();
    expect(service.saveColor).toHaveBeenCalledWith(1, 5, { name: 'Azul', quantity: 12 });
    expect(component.colorItem().quantity).toBe(12);
  });
  it('invalidates grouping preview immediately when mappings or prices change', async () => {
    isAdmin.set(true);
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    component.groupingForm.patchValue({ targetName: 'Bandas', unitPrice: 20 });
    component.addGroupingSource(1);
    component.groupingMappings.at(0).patchValue({ color: 'Azul' });
    service.previewGrouping.mockResolvedValue({ targetName: 'Bandas', sourceCount: 1, colorCount: 1, historyLinks: 2, colors: [{ name: 'Azul', quantity: 10 }], warnings: [], errors: [], canConfirm: true, token: 'signed' });
    await component.previewGrouping();
    expect(component.groupingPreview()?.token).toBe('signed');
    expect(service.confirmGrouping).not.toHaveBeenCalled();
    component.groupingForm.patchValue({ unitPrice: 30 });
    expect(component.groupingPreview()).toBeNull();
    await component.confirmGrouping();
    expect(service.confirmGrouping).not.toHaveBeenCalled();
  });
  it('ignores a grouping response if input changed while reviewing', async () => {
    isAdmin.set(true);
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    component.groupingForm.patchValue({ targetName: 'Bandas' });
    component.addGroupingSource(1);
    component.groupingMappings.at(0).patchValue({ color: 'Azul' });
    let resolve!: (value: unknown) => void;
    service.previewGrouping.mockReturnValueOnce(new Promise(done => resolve = done));
    const pending = component.previewGrouping();
    component.groupingMappings.at(0).patchValue({ color: 'Rojo' });
    resolve({ errors: [], canConfirm: true, token: 'old' });
    await pending;
    expect(component.groupingPreview()).toBeNull();
  });
  it('confirms grouping with the reviewed token and reloads inventory', async () => {
    isAdmin.set(true);
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    component.groupingForm.patchValue({ targetName: 'Bandas' });
    component.addGroupingSource(1);
    component.groupingMappings.at(0).patchValue({ color: 'Azul' });
    service.previewGrouping.mockResolvedValue({ targetName: 'Bandas', sourceCount: 1, colorCount: 1, historyLinks: 0, colors: [], warnings: [], errors: [], canConfirm: true, token: 'signed' });
    service.confirmGrouping.mockResolvedValue({ targetProductId: 2, grouped: 1 });
    await component.previewGrouping();
    await component.confirmGrouping();
    expect(service.confirmGrouping).toHaveBeenCalledWith('signed');
    expect(service.loadInventory).toHaveBeenCalledWith(true);
    expect(component.groupingPreview()).toBeNull();
  });

  it('opens colors and grouping from results without leaving forms on the main page', async () => {
    isAdmin.set(true);
    const family = { ...item, id: 2, name: 'Bandas', requiresColor: true, colors: [{ id: 1, name: 'Azul', quantity: 10 }] };
    service.items.set([item, family] as any);
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    fixture.componentInstance.openColors(family);
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.textContent).toContain('Existencias por color');
    expect(overlay.textContent).toContain('Azul');
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    fixture.componentInstance.closeColors();
    await closed;
    await fixture.whenStable();
    fixture.componentInstance.openGrouping(item);
    await fixture.whenStable();
    expect(overlay.textContent).toContain('Revisar reorganización');
    expect(overlay.textContent).toContain('Las notas históricas se conservarán');
  });

  it('requires review before replacing unassigned legacy stock with color totals', async () => {
    isAdmin.set(true);
    const component = TestBed.createComponent(InventoryPageComponent).componentInstance as any;
    const family = { ...item, name: 'Bandas', requiresColor: true, quantity: 30, colors: [] };
    component.openColors(family);
    component.colorForm.patchValue({ name: 'Azul', quantity: 10 });
    await component.saveColor();
    expect(service.saveColor).not.toHaveBeenCalled();
    expect(component.colorError()).toContain('Revisa');
    component.legacyStockReviewed.setValue(true);
    service.saveColor.mockResolvedValue({ ...family, quantity: 10, colors: [{ id: 1, name: 'Azul', quantity: 10 }] });
    await component.saveColor();
    expect(service.saveColor).toHaveBeenCalledWith(1, null, { name: 'Azul', quantity: 10 });
  });

  it('shows invalid Colores worksheet rows and prevents their confirmation', async () => {
    isAdmin.set(true);
    service.previewImport.mockResolvedValue({ rows: [], colors: [{ rowNumber: 4, productId: 7, name: 'Plateado', quantity: -1, action: 'update', errors: ['La cantidad del color debe ser mayor o igual a cero.'] }], errors: [], createCount: 0, updateCount: 0, canImport: true, token: 'invalid-color' });
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    fixture.componentInstance.openImportDialog();
    await fixture.componentInstance.selectImportFile(new File(['xlsx'], 'inventory.xlsx'));
    await fixture.whenStable();
    const root: HTMLElement = TestBed.inject(OverlayContainer).getContainerElement();
    expect(root.textContent).toContain('Hoja Colores');
    expect(root.textContent).toContain('Plateado');
    expect(root.textContent).toContain('La cantidad del color debe ser mayor o igual a cero.');
    expect(fixture.componentInstance.canConfirmImport()).toBe(false);
    const button = Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('Confirmar importación'))!;
    expect(button.disabled).toBe(true);
    await fixture.componentInstance.confirmImport();
    expect(service.confirmImport).not.toHaveBeenCalled();
  });

});
