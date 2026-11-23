import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { QuotationRecordsService } from './quotation-records.service';
import { OrderRecordsService } from './order-records.service';
import { API_BASE_URL } from '../config/api.config';

describe('Equipment identity survives reading a saved note', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
    { provide: AuthService, useValue: { getAccessToken: () => 'test-only' } },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each(['quotation', 'order'] as const)('preserves product, color IDs and the historical color snapshot in %s', async kind => {
    const service = kind === 'quotation' ? TestBed.inject(QuotationRecordsService) : TestBed.inject(OrderRecordsService);
    const result = kind === 'quotation' ? (service as QuotationRecordsService).loadQuotationById('test', true)
      : (service as OrderRecordsService).loadOrderById('test', true);
    TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/${kind === 'quotation' ? 'quotations' : 'orders'}/test/`).flush({
      quotationId: 'test', orderId: 'test', clientName: 'Ana', quotation: {
        equipmentItems: [{ equipment: 'Mantel redondo', productId: 7, colorId: 11, color: 'Azul', quantity: 2, unitPrice: 50, total: 100 },
          { equipment: 'Mantel redondo azul', productId: 9, quantity: 1, unitPrice: 35, total: 35, canonicalProductId: 70, canonicalColorId: 12, canonicalColor: 'Azul', canonicalEquipment: 'Mantel redondo' }],
      },
    });
    const loaded = await result;
    expect(loaded?.quotation.equipmentItems[0]).toMatchObject({ productId: 7, colorId: 11, color: 'Azul', quantity: 2, unitPrice: 50 });
    expect(loaded?.quotation.equipmentItems[1]).toMatchObject({ productId: 9, equipment: 'Mantel redondo azul', unitPrice: 35, canonicalProductId: 70, canonicalColorId: 12, canonicalColor: 'Azul', canonicalEquipment: 'Mantel redondo' });
  });
});
