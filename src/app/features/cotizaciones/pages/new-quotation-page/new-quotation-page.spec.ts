import { AuthService } from '../../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { NewQuotationPageComponent } from './new-quotation-page';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrderRecordsService } from '../../../../core/services/order-records.service';
import { QuotationRecordsService } from '../../../../core/services/quotation-records.service';
import { FolioStrategyService } from '../../../../core/services/folio-strategy.service';
import { ClientDirectoryService } from '../../../../core/services/client-directory.service';
import { FreightZonesService } from '../../../../core/services/freight-zones.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

describe('Quotation form', () => {
  const openDialog = vi.fn();
  beforeEach(async () => {
    openDialog.mockReset();
    await TestBed.configureTestingModule({
      imports: [NewQuotationPageComponent],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: { open: openDialog } },
        { provide: AuthService, useValue: { isAdmin: signal(true) } },
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}),
        } } },
        { provide: InventoryService, useValue: {
          items: signal([]), isLoading: signal(false), errorMessage: signal(''),
          loadInventory: vi.fn(), findByName: vi.fn(),
        } },
        { provide: FreightZonesService, useValue: { fetchAll: vi.fn().mockResolvedValue([]) } },
        { provide: NotificationService, useValue: { info: vi.fn(), success: vi.fn() } },
        ...[OrderRecordsService, QuotationRecordsService, FolioStrategyService,
          ClientDirectoryService, ConfirmService].map(provide => ({ provide, useValue: {} })),
      ],
    }).compileComponents();
  });

  it('applies each percentage to equipment only and allows a manual amount', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.equipmentRows.at(0).patchValue({ quantity: 2, unitPrice: 500 });
    page.logisticsForm.patchValue({ freight: 200, applyTax: true, securityDeposit: 100 });
    for (const percentage of [5, 10, 15, 20]) {
      page.applyDiscountPercentage(percentage);
      expect(page.summary().discount).toBe(1000 * percentage / 100);
    }
    page.logisticsForm.controls.discount.setValue(123.45);
    expect(page.summary().discount).toBe(123.45);
  });

  it('keeps pickup freight at zero despite neighborhood changes and restores home delivery', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.logisticsForm.controls.freight.setValue(250);
    page.clientInfoForm.controls.deliveryInstructions.setValue('Acceso lateral');
    page.setClientPickup(true);
    page.freightZones.set([{ id: 1, name: 'Centro', price: 300, notes: '' }]);
    page.clientInfoForm.controls.neighborhood.setValue('Centro');
    expect(page.logisticsForm.controls.freight.value).toBe(0);
    expect(page.summary().freight).toBe(0);
    expect(page.clientInfoForm.controls.deliveryInstructions.value).toBe('CLIENTE RECOGE Y ENTREGA');
    page.setClientPickup(false);
    expect(page.summary().freight).toBe(300);
    expect(page.clientInfoForm.controls.deliveryInstructions.value).toBe('Acceso lateral');
  });
  it('links a newly registered product without losing note data or requested quantity', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.clientInfoForm.controls.fullName.setValue('Cliente de prueba');
    const row = page.equipmentRows.at(0);
    row.patchValue({ equipment: 'Mantel azul', quantity: 3, unitPrice: 10, productLinkDirty: true });
    openDialog.mockReturnValue({ afterClosed: () => of({ id: 42, name: 'Mantel azul', unitPrice: 50 }) });
    await page.createInventoryProduct(row);
    expect(row.controls.productId.value).toBe(42);
    expect(row.controls.quantity.value).toBe(3);
    expect(row.controls.equipment.valid).toBe(true);
    expect(page.summary().subtotal).toBe(150);
    expect(page.clientInfoForm.controls.fullName.value).toBe('Cliente de prueba');
    expect(page.quotationForm.dirty).toBe(true);
  });

  it('leaves the note unchanged when product registration is cancelled', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const before = page.quotationForm.getRawValue();
    openDialog.mockReturnValue({ afterClosed: () => of(undefined) });
    await page.createInventoryProduct();
    expect(page.quotationForm.getRawValue()).toEqual(before);
  });

  it('selects the inventory name including color without opening another dialog', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const item = { id: 7, name: 'Mantel redondo azul', quantity: 20, unitPrice: 80, category: 'MANTELERIA' };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item as any);
    page.applyInventorySelection(page.equipmentRows.at(0), { option: { value: item.name } } as any);
    expect(page.equipmentRows.at(0).controls.equipment.value).toBe(item.name);
    expect(page.equipmentRows.at(0).controls.productId.value).toBe(7);
    expect(openDialog).not.toHaveBeenCalled();
  });

});
