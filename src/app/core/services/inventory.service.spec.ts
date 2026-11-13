import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { InventoryService } from './inventory.service';

describe('Inventory Excel and prices', () => {
  let service: InventoryService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { getAccessToken: () => 'test-token' } }] });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('normalizes nullable seasonal prices, explicit zero, and replacement cost', async () => {
    const pending = service.loadInventory(true);
    http.expectOne(`${API_BASE_URL}/inventory/`).flush([
      { id: 1, name: 'Silla', category: 'OTROS', quantity: '2', unitPrice: '25.50', highSeasonPrice: '0.00', replacementCost: '300.50' },
      { id: 2, name: 'Mesa', category: 'OTROS', quantity: 1, unitPrice: 50, highSeasonPrice: null, replacementCost: '0' },
    ]);
    await pending;
    expect(service.items().find(item => item.id === 1)).toMatchObject({ highSeasonPrice: 0, replacementCost: 300.5 });
    expect(service.items().find(item => item.id === 2)).toMatchObject({ highSeasonPrice: null, replacementCost: 0 });
  });
  it('downloads an authenticated Excel blob', async () => {
    const pending = (service as any).exportExcel();
    const request = http.expectOne(`${API_BASE_URL}/inventory/export/excel/`);
    expect(request.request.responseType).toBe('blob');
    expect(request.request.headers.get('Authorization')).toBe('Token test-token');
    const file = new Blob(['xlsx']);
    request.flush(file);
    expect(await pending).toBe(file);
  });
  it('previews multipart uploads and confirms only the supplied token', async () => {
    const file = new File(['xlsx'], 'inventory.xlsx');
    const pending = (service as any).previewImport(file);
    const request = http.expectOne(`${API_BASE_URL}/inventory/import/preview/`);
    expect(request.request.body.get('file')).toBe(file);
    request.flush({ rows: [{ rowNumber: 2, action: 'create', name: 'Mesa', category: 'OTROS', quantity: '2', unitPrice: '50.00', highSeasonPrice: '0.00', replacementCost: null, errors: [] }], errors: [], createCount: 1, updateCount: 0, canImport: true, token: 'signed-token' });
    const preview = await pending;
    expect(preview.token).toBe('signed-token');
    expect(preview.rows[0]).toMatchObject({ quantity: 2, unitPrice: 50, highSeasonPrice: 0, replacementCost: null });
    const confirm = (service as any).confirmImport('signed-token');
    const confirmation = http.expectOne(`${API_BASE_URL}/inventory/import/confirm/`);
    expect(confirmation.request.body).toEqual({ token: 'signed-token' });
    confirmation.flush({ created: 1, updated: 0 });
    expect(await confirm).toEqual({ created: 1, updated: 0 });
  });
});
