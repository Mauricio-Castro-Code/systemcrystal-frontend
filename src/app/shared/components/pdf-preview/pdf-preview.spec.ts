import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfPreviewComponent } from './pdf-preview';

const pdf = vi.hoisted(() => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: '' } }));
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => pdf);

describe('PdfPreviewComponent', () => {
  let fixture: ComponentFixture<PdfPreviewComponent>;
  const cancel = vi.fn();
  const destroy = vi.fn();
  const render = vi.fn();
  const getPage = vi.fn();
  const disconnect = vi.fn();
  let resize: ResizeObserverCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render.mockReturnValue({ promise: Promise.resolve(), cancel });
    getPage.mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
      render,
    });
    pdf.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 3, getPage }),
      destroy,
    });
    fixture = TestBed.createComponent(PdfPreviewComponent);
    fixture.componentRef.setInput('file', { arrayBuffer: async () => new ArrayBuffer(10) });
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function expectPage(number: number) {
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('canvas')?.getAttribute('aria-label')).toBe(
        `Página ${number} de 3 del PDF`,
      );
    });
  }

  it('renders multiple pages without a native PDF iframe and bounds navigation', async () => {
    await expectPage(1);
    const previous = fixture.nativeElement.querySelector('[aria-label="Página anterior"]');
    const next = fixture.nativeElement.querySelector('[aria-label="Página siguiente"]');
    expect(previous.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    next.click();
    await expectPage(2);
    next.click();
    await expectPage(3);
    expect(next.disabled).toBe(true);
    expect(previous.disabled).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('limits canvas memory on large screens and releases resources on exit', async () => {
    await expectPage(1);
    resize([{ contentRect: { width: 4000 } }] as ResizeObserverEntry[], {} as ResizeObserver);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(render).toHaveBeenCalledTimes(2);
    });
    await expectPage(1);
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas.width * canvas.height).toBeLessThan(2_004_000);
    fixture.destroy();
    expect(destroy).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('offers the original PDF when rendering fails', async () => {
    render.mockImplementation(() => ({ promise: Promise.reject(new Error('render failed')), cancel }));
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo mostrar esta página',
      );
    });
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('blob:preview');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('reports invalid documents and retains the open PDF link', async () => {
    pdf.getDocument.mockImplementation(() => {
      throw new Error('invalid PDF');
    });
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo mostrar el documento',
      );
    });
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
  });
});
