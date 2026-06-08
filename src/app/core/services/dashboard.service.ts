import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  DashboardDeliveryRange,
  DashboardOverview,
} from '../../features/dashboard/models/dashboard-overview.model';

interface DashboardOverviewFilters {
  deliveryDateFrom?: string | null;
  deliveryDateTo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly overviewState = signal<DashboardOverview | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');

  readonly overview = this.overviewState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly stats = computed(() => this.overviewState()?.stats ?? []);
  readonly orderGroups = computed(() => this.overviewState()?.orderGroups ?? []);
  readonly generatedAt = computed(() => this.overviewState()?.generatedAt ?? null);
  readonly deliveryRange = computed<DashboardDeliveryRange | null>(
    () => this.overviewState()?.deliveryRange ?? null,
  );

  async loadOverview(filters?: DashboardOverviewFilters): Promise<void> {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      this.errorState.set('No hay una sesion activa para consultar el dashboard.');
      this.overviewState.set(null);
      return;
    }

    this.loadingState.set(true);
    this.errorState.set('');

    try {
      let params = new HttpParams();

      if (filters?.deliveryDateFrom) {
        params = params.set('deliveryDateFrom', filters.deliveryDateFrom);
      }

      if (filters?.deliveryDateTo) {
        params = params.set('deliveryDateTo', filters.deliveryDateTo);
      }

      const overview = await firstValueFrom(
        this.http.get<DashboardOverview>(`${API_BASE_URL}/dashboard/overview/`, {
          params,
          headers: new HttpHeaders({
            Authorization: `Token ${accessToken}`,
          }),
        }),
      );

      this.overviewState.set(overview);
    } catch (error) {
      this.errorState.set(this.resolveErrorMessage(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible cargar los datos reales del dashboard.';
    }

    if (error.status === 401) {
      return 'Tu sesion ya no es valida. Vuelve a iniciar sesion.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend para cargar el dashboard.';
    }

    return this.extractApiMessage(error.error) ?? 'No fue posible cargar los datos reales del dashboard.';
  }

  private extractApiMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    for (const value of Object.values(payload as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value) && typeof value[0] === 'string') {
        return String(value[0]).trim();
      }
    }

    return null;
  }
}
