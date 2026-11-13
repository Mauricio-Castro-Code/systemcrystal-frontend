import { AuthService } from '../../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router, convertToParamMap } from '@angular/router';
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

  it('opens a quotation copy as a new editable draft without changing or saving the source', async () => {
    const quotation = {
      clientInfo: { fullName: 'Ana', phoneNumber: '5512345678', birthDate: null,
        address: 'Calle 1', neighborhood: 'Centro', reference: '', deliveryInstructions: 'Portón' },
      schedule: { deliveryDate: '2026-11-15', eventDate: '2026-11-16', collectionDate: '2026-11-17' },
      logistics: { freight: 200, securityDeposit: 100, applyTax: false },
      equipmentItems: [{ quantity: 2, equipment: 'Silla', unitPrice: 50, total: 100 }],
      summary: { subtotal: 100, freight: 200, taxAmount: 0, securityDeposit: 100,
        discount: 10, advancePayment: 0, totalEstimated: 400, balanceDue: 390 },
    };
    const original = structuredClone(quotation);
    const createDraft = vi.fn().mockResolvedValue({ quotationId: '002COTI-26' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: {
      paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({ duplicarCotizacionDe: '001COTI-26' }),
    } } });
    TestBed.overrideProvider(QuotationRecordsService, { useValue: {
      loadQuotationById: vi.fn().mockResolvedValue({ quotationId: '001COTI-26', quotation }), createDraft,
    } });
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(page.clientInfoForm.controls.fullName.value).toBe('Ana');
    expect(page.scheduleForm.controls.eventDate.value).toEqual(new Date(2026, 10, 16));
    expect(page.equipmentRows.at(0).controls.quantity.value).toBe(2);
    expect(page.summary().discount).toBe(10);
    expect(page.isEditMode).toBe(false);
    expect(page.quotationForm.dirty).toBe(true);
    page.clientInfoForm.controls.fullName.setValue('Copia');
    expect(quotation).toEqual(original);
    expect(createDraft).not.toHaveBeenCalled();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await page.saveDraft();
    expect(createDraft).toHaveBeenCalledWith({ quotation: expect.objectContaining({
      clientInfo: expect.objectContaining({ fullName: 'Copia' }),
    }) });
    expect(navigate).toHaveBeenCalledWith(['/cotizaciones', '002COTI-26']);
    expect(quotation).toEqual(original);
  });

  it.each([
    [new Date(2026, 10, 14), 50],
    [new Date(2026, 10, 15), 80],
    [new Date(2026, 11, 31), 80],
    [new Date(2027, 0, 1), 80],
    [new Date(2027, 0, 2), 50],
  ])('uses the event date %s to select rental price %s', async (date, expected) => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const item = { id: 7, name: 'Silla', quantity: 20, unitPrice: 50, highSeasonPrice: 80, category: 'MOBILIARIO' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    page.scheduleForm.controls.eventDate.setValue(date);
    page.applyInventorySelection(page.equipmentRows.at(0), { option: { value: item.name } } as any);
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(expected);
    expect(page.summary().subtotal).toBe(expected);
  });

  it('updates automatic prices when the date changes but preserves manual prices', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const item = { id: 7, name: 'Silla', quantity: 20, unitPrice: 50, highSeasonPrice: 80, category: 'MOBILIARIO' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    page.applyInventorySelection(page.equipmentRows.at(0), { option: { value: item.name } } as any);
    const row = page.equipmentRows.at(0);
    expect(row.controls.unitPrice.value).toBe(50);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 10, 15));
    expect(row.controls.unitPrice.value).toBe(80);
    page.scheduleForm.controls.eventDate.setValue(new Date(2027, 0, 2));
    expect(row.controls.unitPrice.value).toBe(50);
    row.controls.unitPrice.setValue(65);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 11, 20));
    expect(row.controls.unitPrice.value).toBe(65);
    expect(page.summary().subtotal).toBe(65);
  });

  it.each([null, 0])('uses normal price for null high tariff, but accepts zero (%s)', async highSeasonPrice => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const item = { id: 7, name: 'Silla', quantity: 20, unitPrice: 50, highSeasonPrice, category: 'MOBILIARIO' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 11, 20));
    page.applyInventorySelection(page.equipmentRows.at(0), { option: { value: item.name } } as any);
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(highSeasonPrice ?? 50);
  });

  it('uses the seasonal price when equipment is matched by Enter', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const item = { id: 7, name: 'Silla', quantity: 20, unitPrice: 50, highSeasonPrice: 80, category: 'MOBILIARIO' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 11, 20));
    const row = page.equipmentRows.at(0);
    row.controls.equipment.setValue(item.name);
    page.onEquipmentEnter(row, new KeyboardEvent('keydown', { key: 'Enter' }), { panelOpen: false } as any);
    expect(row.controls.unitPrice.value).toBe(80);
  });

  it('keeps saved quotation prices when loading and changing the event date', async () => {
    const quotation = {
      clientInfo: { fullName: 'Ana', phoneNumber: '5512345678', birthDate: null,
        address: 'Calle 1', neighborhood: 'Centro', reference: '', deliveryInstructions: '' },
      schedule: { deliveryDate: '2026-11-15', eventDate: '2026-11-16', collectionDate: '2026-11-17' },
      logistics: { freight: 0, securityDeposit: 0, applyTax: false },
      equipmentItems: [{ productId: 7, quantity: 2, equipment: 'Silla', unitPrice: 35, total: 70 }],
      summary: { subtotal: 70, freight: 0, taxAmount: 0, securityDeposit: 0,
        discount: 0, advancePayment: 0, totalEstimated: 70, balanceDue: 70 },
    };
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: {
      paramMap: convertToParamMap({ quotationId: '001COTI-26' }), queryParamMap: convertToParamMap({}),
    } } });
    TestBed.overrideProvider(QuotationRecordsService, { useValue: {
      loadQuotationById: vi.fn().mockResolvedValue({ quotationId: '001COTI-26', quotation }),
    } });
    const item = { id: 7, name: 'Silla', quantity: 20, unitPrice: 50, highSeasonPrice: 80, category: 'MOBILIARIO' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(page.isEditMode).toBe(true);
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(35);
    page.scheduleForm.controls.eventDate.setValue(new Date(2027, 0, 2));
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(35);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 11, 20));
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(35);
    expect(page.summary().subtotal).toBe(70);
  });

  it.each([false, true])('preserves pricing behavior after deleting and restoring a row (manual: %s)', async manual => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const item = { id: 7, name: 'Silla', quantity: 20, unitPrice: 50, highSeasonPrice: 80, category: 'MOBILIARIO' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 10, 14));
    page.applyInventorySelection(page.equipmentRows.at(0), { option: { value: item.name } } as any);
    if (manual) page.equipmentRows.at(0).controls.unitPrice.setValue(65);
    page.addEquipmentRow();
    TestBed.inject(ConfirmService).confirmDelete = vi.fn().mockResolvedValue(true);
    vi.mocked(TestBed.inject(NotificationService).info).mockReturnValue({ onAction: () => of() } as any);
    await page.removeEquipmentRow(0);
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 10, 15));
    page.undoLastDelete();
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(manual ? 65 : 80);
    page.scheduleForm.controls.eventDate.setValue(new Date(2027, 0, 2));
    expect(page.equipmentRows.at(0).controls.unitPrice.value).toBe(manual ? 65 : 50);
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
    page.scheduleForm.controls.eventDate.setValue(new Date(2026, 11, 20));
    const row = page.equipmentRows.at(0);
    row.patchValue({ equipment: 'Mantel azul', quantity: 3, unitPrice: 10, productLinkDirty: true });
    openDialog.mockReturnValue({ afterClosed: () => of({ id: 42, name: 'Mantel azul', unitPrice: 50, highSeasonPrice: 80 }) });
    await page.createInventoryProduct(row);
    expect(row.controls.productId.value).toBe(42);
    expect(row.controls.quantity.value).toBe(3);
    expect(row.controls.equipment.valid).toBe(true);
    expect(page.summary().subtotal).toBe(240);
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

  it('only offers registration after Enter on a nonempty unknown product and hides it when edited', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="equipment"]');
    const registrationButton = () => Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('Registrar en Inventario'));
    expect(fixture.nativeElement.textContent).not.toContain('Nuevo producto en inventario');
    expect(registrationButton()).toBeUndefined();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(registrationButton()).toBeUndefined();
    input.value = 'Producto nuevo';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(registrationButton()).toBeUndefined();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    await fixture.whenStable();
    expect(enter.defaultPrevented).toBe(true);
    expect(registrationButton()).toBeDefined();
    input.value = 'Otro producto';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(registrationButton()).toBeUndefined();
  });

  it('links an exact inventory match on Enter instead of offering registration', async () => {
    const fixture = TestBed.createComponent(NewQuotationPageComponent);
    await fixture.whenStable();
    const item = { id: 7, name: 'Mantel azul', quantity: 20, unitPrice: 80, category: 'MANTELERIA' as const };
    vi.mocked(TestBed.inject(InventoryService).findByName).mockReturnValue(item);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="equipment"]');
    input.value = 'mantel azul';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.equipmentRows.at(0).controls.productId.value).toBe(7);
    expect(fixture.nativeElement.textContent).not.toContain('Registrar en Inventario');
  });

});
