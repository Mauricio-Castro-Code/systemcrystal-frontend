import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { Client } from '../../features/clientes/models/client.model';
import {
  ClientAddressHistoryItem,
  ClientOrderHistoryItem,
  ClientProfile,
} from '../../features/clientes/models/client-profile.model';

@Injectable({
  providedIn: 'root',
})
export class ClientDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly clientsState = signal<Client[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');

  readonly clients = this.clientsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly totalClients = computed(() => this.clientsState().length);

  async loadClients(): Promise<void> {
    let headers: HttpHeaders;

    try {
      headers = this.requireAuthHeaders();
    } catch (error) {
      this.errorState.set(this.resolveThrownMessage(error));
      this.clientsState.set([]);
      return;
    }

    this.loadingState.set(true);
    this.errorState.set('');

    try {
      const clients = await firstValueFrom(
        this.http.get<Client[]>(`${API_BASE_URL}/clients/`, {
          headers,
        }),
      );

      this.clientsState.set(clients.map((client) => this.normalizeClient(client)));
    } catch (error) {
      this.errorState.set(this.resolveErrorMessage(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadClientProfile(clientId: string): Promise<ClientProfile> {
    const headers = this.requireAuthHeaders();

    try {
      const clientProfile = await firstValueFrom(
        this.http.get<ClientProfile>(`${API_BASE_URL}/clients/${clientId}/`, {
          headers,
        }),
      );

      return this.normalizeClientProfile(clientProfile);
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  private normalizeClient(client: Client): Client {
    return {
      id: String(client.id ?? '').trim(),
      clientName: String(client.clientName ?? '').trim() || 'Cliente sin nombre',
      contactPerson: String(client.contactPerson ?? '').trim() || 'Pendiente',
      phoneNumber: String(client.phoneNumber ?? '').trim(),
      email: String(client.email ?? '').trim(),
      address: String(client.address ?? '').trim(),
      mergedRecords: Number(client.mergedRecords ?? 1),
    };
  }

  private normalizeClientProfile(clientProfile: ClientProfile): ClientProfile {
    return {
      ...this.normalizeClient(clientProfile),
      mergedClientCodes: Array.isArray(clientProfile.mergedClientCodes)
        ? clientProfile.mergedClientCodes
            .map((code) => String(code ?? '').trim())
            .filter((code) => !!code)
        : [],
      addresses: Array.isArray(clientProfile.addresses)
        ? clientProfile.addresses.map((address) => this.normalizeAddress(address))
        : [],
      orderHistory: Array.isArray(clientProfile.orderHistory)
        ? clientProfile.orderHistory.map((order) => this.normalizeOrderHistory(order))
        : [],
      prefill: {
        clientInfo: {
          fullName:
            String(clientProfile.prefill?.clientInfo?.fullName ?? '').trim()
            || this.normalizeClient(clientProfile).clientName,
          phoneNumber: String(clientProfile.prefill?.clientInfo?.phoneNumber ?? '').trim(),
          birthDate: clientProfile.prefill?.clientInfo?.birthDate ?? null,
          address: String(clientProfile.prefill?.clientInfo?.address ?? '').trim(),
          neighborhood: String(clientProfile.prefill?.clientInfo?.neighborhood ?? '').trim(),
          reference: String(clientProfile.prefill?.clientInfo?.reference ?? '').trim(),
          deliveryInstructions: String(
            clientProfile.prefill?.clientInfo?.deliveryInstructions ?? '',
          ).trim(),
        },
      },
    };
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible cargar el directorio real de clientes.';
    }

    if (error.status === 401) {
      return 'Tu sesion ya no es valida. Vuelve a iniciar sesion.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend para cargar clientes.';
    }

    return this.extractApiMessage(error.error) ?? 'No fue posible cargar el directorio real de clientes.';
  }

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesion activa para consultar los clientes.');
    }

    return new HttpHeaders({
      Authorization: `Token ${accessToken}`,
    });
  }

  private resolveThrownMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible cargar el directorio real de clientes.';
  }

  private normalizeAddress(address: ClientAddressHistoryItem): ClientAddressHistoryItem {
    return {
      address: String(address.address ?? '').trim(),
      addressLine: String(address.addressLine ?? '').trim(),
      neighborhood: String(address.neighborhood ?? '').trim(),
      reference: String(address.reference ?? '').trim(),
      lastUsedAt: String(address.lastUsedAt ?? '').trim(),
      usageCount: Number(address.usageCount ?? 0),
    };
  }

  private normalizeOrderHistory(order: ClientOrderHistoryItem): ClientOrderHistoryItem {
    return {
      orderId: String(order.orderId ?? '').trim(),
      status: String(order.status ?? '').trim() || 'Confirmado',
      confirmedAt: String(order.confirmedAt ?? '').trim(),
      deliveryDate: order.deliveryDate ?? null,
      eventDate: order.eventDate ?? null,
      collectionDate: order.collectionDate ?? null,
      totalEstimated: Number(order.totalEstimated ?? 0),
      address: String(order.address ?? '').trim(),
      reference: String(order.reference ?? '').trim(),
    };
  }

  private extractApiMessage(payload: unknown): string | null {
    if (typeof payload === 'string') {
      const trimmedPayload = payload.trim();

      if (
        !trimmedPayload ||
        trimmedPayload.startsWith('<!DOCTYPE html') ||
        trimmedPayload.startsWith('<html')
      ) {
        return null;
      }

      return trimmedPayload;
    }

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
