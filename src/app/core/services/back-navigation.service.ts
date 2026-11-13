import { Location } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { sessionSignal } from './session-state.service';

interface HistoryEntry { id: number; url: string }
interface InternalHistory { entries: HistoryEntry[]; index: number }

@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly history = sessionSignal<InternalHistory>({ entries: [], index: -1 });
  private readonly currentUrl = signal(this.router.url);
  private pending: { restoredId?: number; replace: boolean; popstate: boolean } = { replace: false, popstate: false };
  readonly isNavigating = signal(false);
  readonly showBack = computed(() => {
    const path = this.path(this.currentUrl());
    return this.isInternal(path) && path !== '/dashboard' && path !== '/mi-ruta';
  });
  readonly label = computed(() => this.labelFor(this.previousUrl() ?? this.fallback(this.currentUrl())));

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.pending = {
          restoredId: event.restoredState?.navigationId,
          replace: Boolean(this.router.currentNavigation()?.extras.replaceUrl),
          popstate: event.navigationTrigger !== 'imperative',
        };
      } else if (event instanceof NavigationEnd) {
        this.recordNavigation(event);
      }
    });
  }

  async goBack(): Promise<void> {
    if (this.isNavigating()) return;
    this.isNavigating.set(true);
    try {
      if (this.previousUrl()) await this.backInHistory();
      else await this.router.navigateByUrl(this.fallback(this.currentUrl()), { replaceUrl: true });
    } finally {
      this.isNavigating.set(false);
    }
  }

  async returnToRecord(url: string): Promise<boolean> {
    if (!this.isInternal(url)) return this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    const previous = this.previousUrl();
    if (previous && this.recordIdentity(previous) === this.recordIdentity(url)) return this.backInHistory();
    return this.router.navigateByUrl(url, { replaceUrl: true });
  }

  private previousUrl(): string | null {
    const history = this.history();
    return history.index > 0 ? history.entries[history.index - 1].url : null;
  }

  private async backInHistory(): Promise<boolean> {
    const completed = firstValueFrom(this.router.events.pipe(
      filter(event => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError), take(1),
    ));
    this.location.back();
    return (await completed) instanceof NavigationEnd;
  }

  private recordNavigation(event: NavigationEnd): void {
    this.currentUrl.set(event.urlAfterRedirects);
    if (!this.isInternal(event.urlAfterRedirects)) {
      this.history.set({ entries: [], index: -1 });
      return;
    }
    const history = this.history();
    const entry = { id: event.id, url: event.urlAfterRedirects };
    if (this.pending.popstate) {
      const index = history.entries.findIndex(item => item.id === this.pending.restoredId);
      if (index < 0) this.history.set({ entries: [entry], index: 0 });
      else this.history.set({ entries: history.entries.map((item, i) => i === index ? entry : item), index });
    } else if (this.pending.replace && history.index >= 0) {
      this.history.set({ ...history, entries: history.entries.map((item, i) => i === history.index ? entry : item) });
    } else {
      const entries = [...history.entries.slice(0, history.index + 1), entry];
      this.history.set({ entries, index: entries.length - 1 });
    }
  }

  private path(url: string): string { return url.split(/[?#]/, 1)[0]; }

  private isInternal(url: string): boolean {
    return /^\/(dashboard|pedidos|cotizaciones|clientes|inventario|contabilidad|equipo|fletes|mi-ruta)(\/|[?#]|$)/.test(url);
  }

  private recordIdentity(url: string): string {
    return this.path(url).replace(/^\/pedidos\/registro\//, '/pedidos/');
  }

  private fallback(url: string): string {
    const path = this.path(url);
    if (/^\/pedidos\/registro\/[^/]+$/.test(path)) return '/pedidos/registro';
    if (/^\/pedidos\/[^/]+\/editar$/.test(path)) return path.replace(/\/editar$/, '');
    if (/^\/pedidos\/(?!registro$)[^/]+$/.test(path)) return '/pedidos';
    if (/^\/cotizaciones\/[^/]+\/editar$/.test(path)) return path.replace(/\/editar$/, '');
    if (/^\/cotizaciones\/(?!nueva$|registro$)[^/]+$/.test(path)) return '/cotizaciones/registro';
    if (/^\/clientes\/[^/]+$/.test(path)) return '/clientes';
    return '/dashboard';
  }

  private labelFor(url: string): string {
    const path = this.path(url);
    if (/^\/pedidos\/(?:registro\/)?[^/]+$/.test(path) && path !== '/pedidos/registro') return 'Volver a la nota';
    if (/^\/cotizaciones\/(?!nueva$|registro$)[^/]+$/.test(path)) return 'Volver a la cotización';
    if (/^\/clientes\/[^/]+$/.test(path)) return 'Volver al cliente';
    const labels: Record<string, string> = {
      '/dashboard': 'Inicio', '/pedidos': 'Notas activas', '/pedidos/registro': 'Registro',
      '/cotizaciones/registro': 'Cotizaciones activas', '/cotizaciones/nueva': 'Crear nota',
      '/clientes': 'Clientes', '/inventario': 'Inventario', '/contabilidad': 'Análisis de datos',
      '/equipo': 'Gestión de usuarios', '/fletes': 'Fletes', '/mi-ruta': 'Mi ruta',
    };
    return labels[path] ? `Volver a ${labels[path]}` : 'Volver';
  }
}
