import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { OrderRecordsService } from './order-records.service';
import { QuotationRecordsService } from './quotation-records.service';
import { PrintQueueService } from './print-queue.service';
import { SessionStateService } from './session-state.service';
import { OrderRecord } from '../../features/pedidos/models/order-record.model';
import { API_BASE_URL } from '../config/api.config';

const record = {
  orderId: '0001-26',
  clientName: 'Cliente',
  printedAt: null,
  printVersion: 'v1',
} as OrderRecord;

describe('Order printing status', () => {
  let records: OrderRecordsService;
  let queue: PrintQueueService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getAccessToken: () => 'test',
            isAuthenticated: () => true,
            isChofer: () => false,
          },
        },
      ],
    });
    records = TestBed.inject(OrderRecordsService);
    queue = TestBed.inject(PrintQueueService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('accepts current queue version even when the list cache still has an older version', async () => {
    records.upsertOrderRecord(record);
    queue.track({ ...record, printVersion: 'v2' });
    const save = records.setPrinted(record.orderId, true, 'v2');
    http
      .expectOne(`${API_BASE_URL}/orders/0001-26/print-status/`)
      .flush({ printedAt: 'today', printVersion: 'v2' });
    await save;
    expect(records.getOrderById(record.orderId)?.printedAt).toBe('today');
    expect(queue.pending()).toEqual([]);
  });

  it('does not overwrite an edit that arrived before the printing response', async () => {
    records.upsertOrderRecord(record);
    const save = records.setPrinted(record.orderId, true, 'v1');
    const failure = expect(save).rejects.toThrow('cambió');
    const request = http.expectOne(`${API_BASE_URL}/orders/0001-26/print-status/`);
    records.upsertOrderRecord({ ...record, printVersion: 'v2' });
    request.flush({ printedAt: 'today', printVersion: 'v1' });
    await failure;
    expect(queue.required()[0].printVersion).toBe('v2');
    expect(records.getOrderById(record.orderId)?.printedAt).toBeNull();
  });

  it('does not restore private records or print requirements from a previous session', async () => {
    const load = records.loadOrderById(record.orderId, true);
    const failure = expect(load).rejects.toThrow();
    const request = http.expectOne(`${API_BASE_URL}/orders/0001-26/`);
    TestBed.inject(SessionStateService).reset();
    request.flush(record);
    await failure;
    expect(queue.pending()).toEqual([]);
    expect(records.getOrderById(record.orderId)).toBeUndefined();
  });

  it('does not add a confirmation returned after the operator changed session', async () => {
    const load = TestBed.inject(QuotationRecordsService).confirmDraftAsOrder('001COTI-26');
    const failure = expect(load).rejects.toThrow();
    const request = http.expectOne(`${API_BASE_URL}/quotations/001COTI-26/confirm/`);
    TestBed.inject(SessionStateService).reset();
    request.flush(record);
    await failure;
    expect(queue.pending()).toEqual([]);
    expect(records.getOrderById(record.orderId)).toBeUndefined();
  });
});
