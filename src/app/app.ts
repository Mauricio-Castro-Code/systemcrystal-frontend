import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationError, Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly swUpdate = inject(SwUpdate);

  constructor() {
    this.watchForAppUpdates();

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

  // El service worker del PWA cachea la app. Cuando hay un deploy nuevo, lo
  // detectamos y ofrecemos actualizar para que no se quede en una version vieja.
  private watchForAppUpdates(): void {
    if (!this.swUpdate.isEnabled || typeof window === 'undefined') {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        const update = window.confirm(
          'Hay una nueva versión de Crystal disponible. ¿Actualizar ahora?',
        );
        if (update) {
          void this.swUpdate.activateUpdate().then(() => window.location.reload());
        }
      });

    // Revisa al iniciar y cada 60 s, así un deploy se nota sin recargar a mano.
    void this.swUpdate.checkForUpdate();
    setInterval(() => void this.swUpdate.checkForUpdate(), 60_000);
  }
}
