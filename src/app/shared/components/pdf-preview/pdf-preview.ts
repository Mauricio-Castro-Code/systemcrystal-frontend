import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

@Component({
  selector: 'app-pdf-preview',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './pdf-preview.html',
  styleUrl: './pdf-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreviewComponent {
  readonly file = input.required<Blob>();
  readonly document = signal<PDFDocumentProxy | null>(null);
  readonly pageNumber = signal(1);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly fileUrl = signal('');
  private readonly pageHost = viewChild.required<ElementRef<HTMLDivElement>>('pageHost');
  private readonly width = signal(320);

  constructor() {
    effect((onCleanup) => {
      const host = this.pageHost().nativeElement;
      const observer = new ResizeObserver(([entry]) => {
        this.width.set(Math.max(1, Math.floor(entry.contentRect.width)));
      });
      observer.observe(host);
      onCleanup(() => observer.disconnect());
    });

    effect((onCleanup) => {
      const file = this.file();
      const url = URL.createObjectURL(file);
      this.fileUrl.set(url);
      this.document.set(null);
      this.pageNumber.set(1);
      this.loading.set(true);
      this.error.set('');
      let disposed = false;
      let task: PDFDocumentLoadingTask | undefined;
      onCleanup(() => {
        disposed = true;
        URL.revokeObjectURL(url);
        void task?.destroy();
      });
      void (async () => {
        try {
          const [pdfjs, buffer] = await Promise.all([
            import('pdfjs-dist/legacy/build/pdf.mjs'),
            file.arrayBuffer(),
          ]);
          if (disposed) return;
          const assets = new URL('pdfjs/', window.document.baseURI).href;
          pdfjs.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
          task = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            cMapUrl: `${assets}cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${assets}standard_fonts/`,
            wasmUrl: `${assets}wasm/`,
          });
          const document = await task.promise;
          if (!disposed) this.document.set(document);
        } catch {
          if (!disposed) {
            this.error.set(
              'No se pudo mostrar el documento. Puedes abrir el PDF o actualizar la vista.',
            );
            this.loading.set(false);
          }
        }
      })();
    });

    effect((onCleanup) => {
      const document = this.document();
      const number = this.pageNumber();
      const width = this.width();
      const host = this.pageHost().nativeElement;
      host.replaceChildren();
      if (!document) return;
      this.loading.set(true);
      this.error.set('');
      let disposed = false;
      let task: RenderTask | undefined;
      const canvas = window.document.createElement('canvas');
      onCleanup(() => {
        disposed = true;
        task?.cancel();
        canvas.remove();
        canvas.width = canvas.height = 0;
      });
      void (async () => {
        try {
          const page = await document.getPage(number);
          if (disposed) return;
          const original = page.getViewport({ scale: 1 });
          const displayScale = width / original.width;
          // Limit the canvas to two megapixels to keep memory bounded on iPhone.
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          const scale = Math.min(
            displayScale * pixelRatio,
            Math.sqrt(2_000_000 / (original.width * original.height)),
          );
          const viewport = page.getViewport({ scale });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `Página ${number} de ${document.numPages} del PDF`);
          task = page.render({ canvas, viewport });
          await task.promise;
          if (!disposed) host.replaceChildren(canvas);
        } catch {
          if (!disposed)
            this.error.set('No se pudo mostrar esta página. Puedes abrir el PDF completo.');
        } finally {
          if (!disposed) this.loading.set(false);
        }
      })();
    });
  }
}
