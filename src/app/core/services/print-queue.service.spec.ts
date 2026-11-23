import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { SessionStateService } from './session-state.service';
import { PrintQueueService, PendingPrint } from './print-queue.service';

const note: PendingPrint = {
  orderId: '0001-26',
  clientName: 'Cliente',
  printedAt: null,
  printVersion: 'version-1',
  printRequiredAt: '2026-11-22T12:00:00Z',
  printPostponedAt: null,
  printPostponedReason: '',
  printPostponedBy: null,
};

describe('PrintQueueService', () => {
  let service: PrintQueueService;
  let http: HttpTestingController;
  let token: string | null;
  beforeEach(() => {
    token = 'test';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getAccessToken: () => token,
            isAuthenticated: () => !!token,
            isChofer: () => false,
          },
        },
      ],
    });
    service = TestBed.inject(PrintQueueService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('restores required and postponed notes from the server', async () => {
    const load = service.refresh();
    http.expectOne(`${API_BASE_URL}/orders/print-queue/`).flush([
      note,
      {
        ...note,
        orderId: '0002-26',
        printPostponedAt: '2026-11-22',
        printPostponedReason: 'Sin papel',
      },
    ]);
    await load;
    expect(service.pending().length).toBe(2);
    expect(service.required().map((row) => row.orderId)).toEqual(['0001-26']);
  });

  it('discards an old session response and clears private queue data', async () => {
    service.track(note);
    const load = service.refresh();
    const request = http.expectOne(`${API_BASE_URL}/orders/print-queue/`);
    token = null;
    TestBed.inject(SessionStateService).reset();
    request.flush([note]);
    await load;
    expect(service.pending()).toEqual([]);
  });

  it('does not overwrite a newly confirmed or edited note with an older queue response', async () => {
    const load = service.refresh();
    const request = http.expectOne(`${API_BASE_URL}/orders/print-queue/`);
    service.track({ ...note, printVersion: 'version-2' });
    request.flush([]);
    await load;
    expect(service.required()[0].printVersion).toBe('version-2');
  });

  it('keeps pending notes and shows a recoverable error on queue failure', async () => {
    service.track(note);
    const load = service.refresh();
    http
      .expectOne(`${API_BASE_URL}/orders/print-queue/`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await load;
    expect(service.pending()).toEqual([note]);
    expect(service.error()).toContain('pendientes');
  });

  it('postpones with a version and leaves the note pending without printing it', async () => {
    service.track(note);
    const save = service.postpone(note, 'Sin papel');
    const request = http.expectOne(`${API_BASE_URL}/orders/0001-26/print-postpone/`);
    expect(request.request.body).toEqual({ printVersion: 'version-1', reason: 'Sin papel' });
    request.flush({ ...note, printPostponedAt: '2026-11-22', printPostponedReason: 'Sin papel' });
    await save;
    expect(service.required()).toEqual([]);
    expect(service.pending()[0].printedAt).toBeNull();
    expect(service.pending()[0].printPostponedReason).toBe('Sin papel');
  });

  it('retains the modal requirement when saving postponement fails', async () => {
    service.track(note);
    const save = service.postpone(note, 'Sin papel');
    const failure = expect(save).rejects.toThrow();
    http
      .expectOne(`${API_BASE_URL}/orders/0001-26/print-postpone/`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await failure;
    expect(service.required()).toEqual([note]);
  });
  it('rejects an empty or non-PDF export without removing its pending requirement', async () => {
    service.track(note);
    const load = service.getPdf(note);
    const failure = expect(load).rejects.toThrow('PDF válido');
    const request = http.expectOne((req) => req.url.endsWith('/export/pdf/'));
    expect(request.request.params.get('printVersion')).toBe('version-1');
    request.flush(new Blob(['{}'], { type: 'application/json' }));
    await failure;
    expect(service.required()).toEqual([note]);
  });

  it('does not restore an older version when a postponement response arrives after an edit', async () => {
    service.track(note);
    const save = service.postpone(note, 'Sin papel');
    const failure = expect(save).rejects.toThrow('cambió');
    const request = http.expectOne(`${API_BASE_URL}/orders/0001-26/print-postpone/`);
    service.track({ ...note, printVersion: 'version-2' });
    request.flush({ ...note, printPostponedAt: 'today' });
    await failure;
    expect(service.required()[0].printVersion).toBe('version-2');
  });
  it('does not repeatedly request a queue denied by the server and permits explicit retry', async () => {
    const load = service.refresh();
    const request = http.expectOne(`${API_BASE_URL}/orders/print-queue/`);
    TestBed.inject(SessionStateService).reset();
    request.flush({}, { status: 403, statusText: 'Forbidden' });
    await load;
    expect(service.error()).toContain('permiso');
    await service.refresh();
    http.expectNone(`${API_BASE_URL}/orders/print-queue/`);
    const retry = service.refresh(true);
    http.expectOne(`${API_BASE_URL}/orders/print-queue/`).flush([]);
    await retry;
    expect(service.error()).toBe('');
  });
});
