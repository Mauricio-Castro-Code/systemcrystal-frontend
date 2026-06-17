import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';

import { AuthService } from '../../../../core/services/auth.service';
import { DriverRouteService } from '../../../../core/services/driver-route.service';
import { DriverRouteStop } from '../../models/driver-route.model';

type MiRutaTab = 'ruta' | 'historial' | 'perfil';

@Component({
  selector: 'app-mi-ruta-page',
  imports: [],
  templateUrl: './mi-ruta-page.html',
  styleUrl: './mi-ruta-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiRutaPageComponent implements OnInit {
  private readonly routeService = inject(DriverRouteService);
  private readonly authService = inject(AuthService);

  protected readonly route = this.routeService.route;
  protected readonly isLoading = this.routeService.isLoading;
  protected readonly errorMessage = this.routeService.errorMessage;
  protected readonly session = this.authService.userSession;

  protected readonly activeTab = signal<MiRutaTab>('ruta');
  protected readonly busyOrderId = signal<string | null>(null);

  // Una parada se considera pendiente mientras no se haya entregado.
  private readonly pendingStatuses = new Set(['PROGRAMADA', 'EN_CAMINO']);

  protected readonly pendingStops = computed(() =>
    (this.route()?.stops ?? []).filter((stop) => this.pendingStatuses.has(stop.operationalStatus)),
  );

  protected readonly completedStops = computed(() =>
    (this.route()?.stops ?? []).filter((stop) => !this.pendingStatuses.has(stop.operationalStatus)),
  );

  // La primera parada pendiente es la "siguiente parada".
  protected readonly nextStopId = computed(() => this.pendingStops()[0]?.orderId ?? null);

  ngOnInit(): void {
    void this.routeService.loadRoute();
  }

  protected driverInitials(): string {
    const name = this.session()?.displayName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected isNextStop(stop: DriverRouteStop): boolean {
    return stop.orderId === this.nextStopId();
  }

  protected stopBadge(stop: DriverRouteStop): { label: string; tone: string } {
    if (!this.pendingStatuses.has(stop.operationalStatus)) {
      return { label: stop.operationalStatusLabel, tone: 'done' };
    }
    if (stop.operationalStatus === 'EN_CAMINO') {
      return { label: 'En camino', tone: 'active' };
    }
    if (this.isNextStop(stop)) {
      return { label: 'Siguiente parada', tone: 'next' };
    }
    return { label: 'En cola', tone: 'queued' };
  }

  protected actionLabel(stop: DriverRouteStop): string {
    return stop.operationalStatus === 'EN_CAMINO' ? 'Marcar Entregado' : 'Iniciar Entrega';
  }

  protected async advanceStop(stop: DriverRouteStop): Promise<void> {
    if (this.busyOrderId()) {
      return;
    }
    const next = stop.operationalStatus === 'EN_CAMINO' ? 'ENTREGADO' : 'EN_CAMINO';
    this.busyOrderId.set(stop.orderId);
    try {
      await this.routeService.updateStopStatus(stop.orderId, next);
    } finally {
      this.busyOrderId.set(null);
    }
  }

  protected openMaps(stop: DriverRouteStop): void {
    if (!stop.mapsUrl) {
      return;
    }
    window.open(stop.mapsUrl, '_blank', 'noopener');
  }

  protected setTab(tab: MiRutaTab): void {
    this.activeTab.set(tab);
  }

  protected reload(): void {
    void this.routeService.loadRoute(this.route()?.date);
  }

  protected async signOut(): Promise<void> {
    await this.authService.signOut();
    window.location.assign('/login');
  }
}
