import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  InventoryItem,
  InventoryItemPayload,
} from '../../features/inventario/models/inventory-item.model';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly itemsState = signal<InventoryItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal('');

  readonly items = this.itemsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly totalItems = computed(() => this.itemsState().length);

  async loadInventory(force = false): Promise<void> {
    if (this.loadingState() || (this.loadedState() && !force)) {
      return;
    }

    let headers: HttpHeaders;

    try {
      headers = this.requireAuthHeaders();
    } catch (error) {
      this.itemsState.set([]);
      this.errorState.set(this.resolveThrownMessage(error));
      return;
    }

    this.loadingState.set(true);
    this.errorState.set('');

    try {
      const inventory = await firstValueFrom(
        this.http.get<InventoryItem[]>(`${API_BASE_URL}/inventory/`, {
          headers,
        }),
      );

      this.itemsState.set(
        this.sortItems(inventory.map((item) => this.normalizeItem(item))),
      );
      this.loadedState.set(true);
    } catch (error) {
      this.errorState.set(
        this.resolveHttpError(error, 'No fue posible cargar el inventario real.'),
      );
    } finally {
      this.loadingState.set(false);
    }
  }

  async createItem(payload: InventoryItemPayload): Promise<InventoryItem> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const createdItem = await firstValueFrom(
        this.http.post<InventoryItem>(`${API_BASE_URL}/inventory/`, payload, {
          headers,
        }),
      );
      const normalizedItem = this.normalizeItem(createdItem);

      this.itemsState.update((items) =>
        this.sortItems([...items, normalizedItem]),
      );
      this.loadedState.set(true);

      return normalizedItem;
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible registrar el producto.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async updateItem(
    productId: number,
    payload: InventoryItemPayload,
  ): Promise<InventoryItem> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const updatedItem = await firstValueFrom(
        this.http.put<InventoryItem>(
          `${API_BASE_URL}/inventory/${productId}/`,
          payload,
          {
            headers,
          },
        ),
      );
      const normalizedItem = this.normalizeItem(updatedItem);

      this.itemsState.update((items) =>
        this.sortItems(
          items.map((item) =>
            item.id === normalizedItem.id ? normalizedItem : item,
          ),
        ),
      );

      return normalizedItem;
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible actualizar el producto.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async deleteItem(productId: number): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      await firstValueFrom(
        this.http.delete<void>(`${API_BASE_URL}/inventory/${productId}/`, {
          headers,
        }),
      );

      this.itemsState.update((items) =>
        items.filter((item) => item.id !== productId),
      );
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible eliminar el producto.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  findByName(name: string): InventoryItem | null {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      return null;
    }

    return (
      this.itemsState().find(
        (item) => item.name.trim().toLowerCase() === normalizedName,
      ) ?? null
    );
  }

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesion activa para administrar el inventario.');
    }

    return new HttpHeaders({
      Authorization: `Token ${accessToken}`,
    });
  }

  private normalizeItem(item: InventoryItem): InventoryItem {
    return {
      id: Number(item.id ?? 0),
      name: String(item.name ?? '').trim() || 'Producto sin nombre',
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
    };
  }

  private sortItems(items: InventoryItem[]): InventoryItem[] {
    return [...items].sort((firstItem, secondItem) =>
      firstItem.name.localeCompare(secondItem.name, 'es', {
        sensitivity: 'base',
      }),
    );
  }

  private resolveThrownMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible administrar el inventario.';
  }

  private resolveHttpError(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 401) {
      return 'Tu sesion ya no es valida. Vuelve a iniciar sesion.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend para administrar inventario.';
    }

    return this.extractApiMessage(error.error) ?? fallbackMessage;
  }

  private extractApiMessage(payload: unknown): string | null {
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
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
