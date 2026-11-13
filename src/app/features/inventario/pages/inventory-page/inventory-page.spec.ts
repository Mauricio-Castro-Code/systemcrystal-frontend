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
  };
  const confirmDelete = vi.fn();
  beforeEach(async () => {
    isAdmin.set(false);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [InventoryPageComponent],
      providers: [
        { provide: AuthService, useValue: { isAdmin } },
        { provide: InventoryService, useValue: service },
        { provide: ConfirmService, useValue: { confirmDelete } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
  });
  it('shows read-only inventory to office users and prevents mutations', async () => {
    const fixture = TestBed.createComponent(InventoryPageComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.inventory-card--form')).toBeNull();
    expect(root.querySelector('[aria-label="Editar producto"]')).toBeNull();
    expect(root.querySelector('[aria-label="Eliminar producto"]')).toBeNull();
    expect(root.querySelector('.category-select')).toBeNull();
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
    expect(root.querySelector('.inventory-card--form')).not.toBeNull();
    expect(root.querySelector('[aria-label="Editar producto"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Eliminar producto"]')).not.toBeNull();
    expect(root.querySelector('.category-select')).not.toBeNull();
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
    await fixture.componentInstance.selectImportFile(new File(['xlsx'], 'inventory.xlsx'));
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
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

});
