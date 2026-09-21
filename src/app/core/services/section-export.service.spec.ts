import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { ExportSection, SectionExportService } from './section-export.service';

describe('SectionExportService', () => {
  let service: SectionExportService;
  let requests: HttpTestingController;
  const getAccessToken = vi.fn();

  beforeEach(() => {
    getAccessToken.mockReturnValue('test-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getAccessToken } },
      ],
    });
    service = TestBed.inject(SectionExportService);
    requests = TestBed.inject(HttpTestingController);
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    requests.verify();
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ['clients', 'clients', 'Clientes.xlsx'],
    ['active', 'orders', 'Notas_Activas.zip'],
    ['archive', 'orders/archive', 'Registro_Notas.zip'],
  ])(
    'downloads the complete %s section using an authenticated request',
    async (section, path, filename) => {
      const clicked: string[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push(this.download);
      });
      const result = service.download(section as ExportSection);
      const request = requests.expectOne(`${API_BASE_URL}/${path}/export/excel/`);
      expect(request.request.headers.get('Authorization')).toBe('Token test-token');
      expect(request.request.params.keys()).toEqual([]);
      request.flush(new Blob(['zip-content'], { type: 'application/zip' }));
      await result;
      expect(clicked).toEqual([filename]);
      expect(document.querySelector('a[download]')).toBeNull();
      vi.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
    },
  );

  it('does not download an error response and allows the caller to retry', async () => {
    const result = service.download('clients');
    const rejection = expect(result).rejects.toThrow('No fue posible generar');
    requests
      .expectOne(`${API_BASE_URL}/clients/export/excel/`)
      .flush(new Blob(['server-error']), { status: 500, statusText: 'Error' });
    await rejection;
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('shows the failing folio instead of downloading an incomplete backup', async () => {
    const result = service.download('active');
    const rejection = expect(result).rejects.toThrow('No se pudo exportar la nota N-70');
    const errorBody = new Blob([], { type: 'application/json' });
    Object.defineProperty(errorBody, 'text', {
      value: async () => JSON.stringify(['No se pudo exportar la nota N-70: plantilla inválida.']),
    });
    requests
      .expectOne(`${API_BASE_URL}/orders/export/excel/`)
      .flush(errorBody, { status: 400, statusText: 'Bad Request' });
    await rejection;
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects export without an active session', async () => {
    getAccessToken.mockReturnValue(null);
    await expect(service.download('clients')).rejects.toThrow('Inicia sesión');
    requests.expectNone(`${API_BASE_URL}/clients/export/excel/`);
  });
});
