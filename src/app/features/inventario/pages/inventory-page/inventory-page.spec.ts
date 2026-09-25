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
});
