import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  DriverRoute,
  DriverRouteStop,
  StopPriority,
} from '../../features/mi-ruta/models/driver-route.model';
import {
  OrderOperationalStatus,
  OrderRecord,
} from '../../features/pedidos/models/order-record.model';

export interface StopConstraintInput {
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  priority?: StopPriority | null;
  note?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DriverRouteService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly routeState = signal<DriverRoute | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  private readonly optimizingState = signal(false);
  private readonly optimizeErrorState = signal('');

  readonly route = this.routeState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly isOptimizing = this.optimizingState.asReadonly();
  readonly optimizeErrorMessage = this.optimizeErrorState.asReadonly();

  async loadRoute(date?: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set('');

    try {
      const headers = this.requireAuthHeaders();
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const route = await firstValueFrom(
        this.http.get<DriverRoute>(`${API_BASE_URL}/orders/my-route/${query}`, { headers }),
      );
      this.routeState.set(route);
    } catch (error) {
      this.routeState.set(null);
      this.errorState.set(this.resolveErrorMessage(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async updateStopStatus(
    orderId: string,
    operationalStatus: OrderOperationalStatus,
  ): Promise<void> {
    const headers = this.requireAuthHeaders();

    await firstValueFrom(
      this.http.post<OrderRecord>(
        `${API_BASE_URL}/orders/${orderId}/status/`,
        { operationalStatus },
        { headers },
      ),
    );

    // Refrescamos la ruta del día que está cargada actualmente.
    await this.loadRoute(this.routeState()?.date);
  }

  async optimizeRoute(): Promise<void> {
    this.optimizingState.set(true);
    this.optimizeErrorState.set('');

    try {
      const headers = this.requireAuthHeaders();
      const origin = await this.tryGetCurrentPosition();
      const route = await firstValueFrom(
        this.http.post<DriverRoute>(
          `${API_BASE_URL}/orders/my-route/optimize/`,
          origin ? { originLat: origin.lat, originLng: origin.lng } : {},
          { headers },
        ),
      );
      this.routeState.set(route);
    } catch (error) {
      this.optimizeErrorState.set(this.resolveErrorMessage(error));
    } finally {
      this.optimizingState.set(false);
    }
  }

  // Ubicación del chofer al momento de optimizar, para partir de ahí en vez de
  // la bodega. Sin bloquear: si el navegador no la da (permiso negado, no
  // soportado, tarda demasiado), el backend cae de vuelta a la dirección fija.
  private tryGetCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    if (!('geolocation' in navigator)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
      );
    });
  }

  async setStopConstraint(orderId: string, payload: StopConstraintInput): Promise<DriverRouteStop> {
    const headers = this.requireAuthHeaders();
    const stop = await firstValueFrom(
      this.http.post<DriverRouteStop>(`${API_BASE_URL}/orders/${orderId}/constraint/`, payload, {
        headers,
      }),
    );
    await this.loadRoute(this.routeState()?.date);
    return stop;
  }

  async clearStopConstraint(orderId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    await firstValueFrom(
      this.http.delete<DriverRouteStop>(`${API_BASE_URL}/orders/${orderId}/constraint/`, {
        headers,
      }),
    );
    await this.loadRoute(this.routeState()?.date);
  }

  async setStopMapsLink(orderId: string, url: string): Promise<DriverRouteStop> {
    const headers = this.requireAuthHeaders();
    const stop = await firstValueFrom(
      this.http.post<DriverRouteStop>(
        `${API_BASE_URL}/orders/${orderId}/maps-link/`,
        { url },
        { headers },
      ),
    );
    await this.loadRoute(this.routeState()?.date);
    return stop;
  }

  async addOrderByFolio(folio: string): Promise<DriverRouteStop> {
    const headers = this.requireAuthHeaders();
    const stop = await firstValueFrom(
      this.http.post<DriverRouteStop>(
        `${API_BASE_URL}/orders/my-route/add-order/`,
        { orderId: folio },
        { headers },
      ),
    );
    await this.loadRoute(this.routeState()?.date);
    return stop;
  }

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesión activa.');
    }

    return new HttpHeaders({ Authorization: `Token ${accessToken}` });
  }

  private resolveErrorMessage(error: unknown): string {
    const fallback = 'No se pudo cargar tu ruta. Intenta de nuevo.';

    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    const body = error.error;

    if (typeof body === 'string') {
      return body;
    }

    // DRF responde {"detail": "..."} o, cuando falla la validación, ["..."].
    if (Array.isArray(body)) {
      return typeof body[0] === 'string' ? body[0] : fallback;
    }

    return (body?.detail || body?.message || fallback) as string;
  }
}
