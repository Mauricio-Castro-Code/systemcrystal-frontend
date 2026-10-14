import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { CreateInventoryDialogComponent } from './create-inventory-dialog';

describe('CreateInventoryDialogComponent', () => {
  const createItem = vi.fn();
  const close = vi.fn();
  beforeEach(async () => {
    createItem.mockReset();
    close.mockReset();
    await TestBed.configureTestingModule({
      imports: [CreateInventoryDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { name: 'Mantel azul', unitPrice: 50 } },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
        { provide: AuthService, useValue: { isAdmin: signal(true) } },
        { provide: InventoryService, useValue: { createItem } },
      ],
    }).compileComponents();
  });

  it('creates a catalog product with its stock and returns it to the note', async () => {
    const fixture = TestBed.createComponent(CreateInventoryDialogComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.form.patchValue({ name: ' Mantel azul ', category: 'MANTELERIA', quantity: 25 });
    const item = { id: 10, name: 'Mantel azul', category: 'MANTELERIA', quantity: 25, unitPrice: 50 };
    createItem.mockResolvedValue(item);
    await page.save();
    expect(createItem).toHaveBeenCalledExactlyOnceWith({
      name: 'Mantel azul', category: 'MANTELERIA', quantity: 25, unitPrice: 50,
    });
    expect(close).toHaveBeenCalledWith(item);
  });

  it('keeps the entered values and permits retry after an API error', async () => {
    const fixture = TestBed.createComponent(CreateInventoryDialogComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    createItem.mockRejectedValue(new Error('Ya existe ese producto.'));
    await page.save();
    expect(close).not.toHaveBeenCalled();
    expect(page.errorMessage()).toBe('Ya existe ese producto.');
    expect(page.form.controls.name.value).toBe('Mantel azul');
    expect(page.isSaving()).toBe(false);
    expect(page.dialogRef.disableClose).toBe(false);
  });

  it('rejects blank names and invalid stock before calling the API', async () => {
    const fixture = TestBed.createComponent(CreateInventoryDialogComponent);
    await fixture.whenStable();
    fixture.componentInstance.form.patchValue({ name: '   ', quantity: -1 });
    await fixture.componentInstance.save();
    expect(createItem).not.toHaveBeenCalled();
  });
});
