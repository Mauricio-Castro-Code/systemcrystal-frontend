import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationError, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);

  constructor() {
    // Tras un nuevo deploy, un chunk perezoso (ej. el editor) puede quedar con
    // un hash viejo en cache. Al navegar falla y "no abre nada". Si detectamos
    // ese error de carga de chunk, recargamos a la URL destino para traer los
    // archivos frescos (con guarda para no entrar en bucle de recargas).
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationError)) {
        return;
      }

      const message = String(
        (event.error as { message?: string })?.message ?? event.error ?? '',
      );
      const isChunkLoadError =
        /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(
          message,
        );

      if (!isChunkLoadError || typeof window === 'undefined') {
        return;
      }

      const lastReloadAt = Number(sessionStorage.getItem('chunkReloadAt') ?? '0');

      if (Date.now() - lastReloadAt > 10_000) {
        sessionStorage.setItem('chunkReloadAt', String(Date.now()));
        window.location.assign(event.url);
      }
    });
  }
}
