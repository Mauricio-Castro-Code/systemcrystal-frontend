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
  it('registers and updates stock by color, replacing the catalog item', async () => {
    const created = (service as any).saveColor(1, null, { name: 'Azul', quantity: 8 });
    http.expectOne(`${API_BASE_URL}/inventory/1/colors/`).flush({ id: 1, name: 'Bandas', quantity: 8, category: 'MANTELERIA', unitPrice: 20, requiresColor: true, colors: [{ id: 2, name: 'Azul', quantity: 8 }] });
    expect((await created).colors[0].quantity).toBe(8);
    const updated = (service as any).saveColor(1, 2, { name: 'Azul', quantity: 12 });
    const request = http.expectOne(`${API_BASE_URL}/inventory/1/colors/2/`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Azul', quantity: 12 });
    request.flush({ id: 1, name: 'Bandas', quantity: 12, category: 'MANTELERIA', unitPrice: 20, colors: [{ id: 2, name: 'Azul', quantity: 12 }] });
    await updated;
    expect(service.items()[0].quantity).toBe(12);
  });
  it('uses separate grouping preview and explicit token confirmation requests', async () => {
    const payload = { targetName: 'Bandas', unitPrice: 20, highSeasonPrice: null, replacementCost: 50, sourceMappings: [{ sourceId: 1, color: 'Azul' }] };
    const preview = (service as any).previewGrouping(payload);
    const request = http.expectOne(`${API_BASE_URL}/inventory/grouping/preview/`);
    expect(request.request.body).toEqual(payload);
    request.flush({ targetName: 'Bandas', sourceCount: 1, colorCount: 1, historyLinks: 0, colors: [{ name: 'Azul', quantity: '8' }], warnings: [], errors: [], canConfirm: true, token: 'group-token' });
    expect((await preview).colors[0].quantity).toBe(8);
    const confirmation = (service as any).confirmGrouping('group-token');
    const confirmRequest = http.expectOne(`${API_BASE_URL}/inventory/grouping/confirm/`);
    expect(confirmRequest.request.body).toEqual({ token: 'group-token' });
    confirmRequest.flush({ targetProductId: 2, grouped: 1 });
    expect(await confirmation).toEqual({ targetProductId: 2, grouped: 1 });
  });
  it('normalizes Colores worksheet stock preserving invalid blank values', async () => {
    const pending = service.previewImport(new File(['xlsx'], 'inventory.xlsx'));
    http.expectOne(`${API_BASE_URL}/inventory/import/preview/`).flush({ rows: [], colors: [{ rowNumber: 2, productId: 1, name: 'Azul', quantity: '0', action: 'create', errors: [] }, { rowNumber: 3, productId: 1, name: 'Rojo', quantity: null, action: 'update', errors: ['Cantidad requerida.'] }], errors: [], createCount: 0, updateCount: 0, canImport: false, token: null });
    expect((await pending as any).colors.map((row: any) => row.quantity)).toEqual([0, null]);
    const withoutColors = service.previewImport(new File(['xlsx'], 'products.xlsx'));
    http.expectOne(`${API_BASE_URL}/inventory/import/preview/`).flush({ rows: [], errors: [], createCount: 0, updateCount: 0, canImport: true, token: 'products-only' });
    expect((await withoutColors as any).colors).toEqual([]);
  });
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

describe('Inventory colors normalization', () => {
  it('keeps registered colors and their individual stock', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { getAccessToken: () => 'test-token' } }] });
    const service = TestBed.inject(InventoryService);
    const http = TestBed.inject(HttpTestingController);
    const pending = service.loadInventory(true);
    http.expectOne(`${API_BASE_URL}/inventory/`).flush([{ id: 1, name: 'Bandas', category: 'MANTELERIA', quantity: '8', unitPrice: '20', requiresColor: true, isActive: true, canonicalProductId: null, colors: [{ id: '2', name: 'Azul', quantity: '8' }] }]);
    await pending;
    expect(service.items()[0]).toMatchObject({ requiresColor: true, isActive: true, canonicalProductId: null, colors: [{ id: 2, name: 'Azul', quantity: 8 }] });
    http.verify();
  });
});
