import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { DriverRoute } from '../../features/mi-ruta/models/driver-route.model';
import {
  OrderOperationalStatus,
  OrderRecord,
} from '../../features/pedidos/models/order-record.model';

@Injectable({
  providedIn: 'root',
})
export class DriverRouteService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly routeState = signal<DriverRoute | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');

  readonly route = this.routeState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();

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

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesión activa.');
    }

    return new HttpHeaders({ Authorization: `Token ${accessToken}` });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error && (error.error.detail || error.error.message)) as
        | string
        | undefined;
      return detail || 'No se pudo cargar tu ruta. Intenta de nuevo.';
    }
    return 'No se pudo cargar tu ruta. Intenta de nuevo.';
  }
}
