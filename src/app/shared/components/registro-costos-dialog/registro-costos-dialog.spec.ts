import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { OrderRecordsService } from '../../../core/services/order-records.service';
import { RegistroCostosDialogComponent } from './registro-costos-dialog';

describe('RegistroCostosDialogComponent', () => {
  const addExtraCost = vi.fn();
  const updateRetainedDeposit = vi.fn();
  const record = {
    orderId: '1-26', totalEstimated: 1200, totalExtraCosts: 100, extraCosts: [],
    retainedDeposit: 0,
    quotation: {
      clientInfo: { fullName: 'Cliente', phoneNumber: '', address: '' },
      schedule: {}, summary: { subtotal: 1000, freight: 0, securityDeposit: 200, discount: 50 },
    },
  };
  beforeEach(async () => {
    addExtraCost.mockReset().mockResolvedValue(record);
    updateRetainedDeposit.mockReset();
    await TestBed.configureTestingModule({
      imports: [RegistroCostosDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: record },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: AuthService, useValue: { isAdmin: signal(true) } },
        { provide: OrderRecordsService, useValue: { addExtraCost, updateRetainedDeposit } },
      ],
    }).compileComponents();
  });

  it('requires a category and sends the standardized code separately from the detail', async () => {
    const fixture = TestBed.createComponent(RegistroCostosDialogComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.montoControl.setValue(125);
    await page.addCost();
    expect(addExtraCost).not.toHaveBeenCalled();
    page.categoryControl.setValue('CARPAS');
    page.conceptoControl.setValue('Proveedor A');
    await page.addCost();
    expect(addExtraCost).toHaveBeenCalledExactlyOnceWith('1-26', {
      categoria: 'CARPAS', concepto: 'Proveedor A', monto: 125,
    });
    expect(page.categoryControl.value).toBeNull();
  });

  it('excludes the deposit and subtracts the discount once from utility', async () => {
    const fixture = TestBed.createComponent(RegistroCostosDialogComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance.revenue()).toBe(950);
    expect(fixture.componentInstance.utility()).toBe(850);
  });

  it('rejects excess retention and updates utility after saving an allowed amount', async () => {
    const fixture = TestBed.createComponent(RegistroCostosDialogComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.retainedDepositControl.setValue(201);
    await page.saveRetainedDeposit();
    expect(updateRetainedDeposit).not.toHaveBeenCalled();
    updateRetainedDeposit.mockResolvedValue({ ...record, retainedDeposit: 75, accountingRevenue: 1025 });
    page.retainedDepositControl.setValue(75);
    await page.saveRetainedDeposit();
    expect(page.utility()).toBe(925);
    expect(updateRetainedDeposit).toHaveBeenCalledExactlyOnceWith('1-26', 75);
  });
});
