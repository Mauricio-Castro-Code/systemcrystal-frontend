import { sessionSignal } from './session-state.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  INVENTORY_CATEGORIES,
  InventoryCategory,
  InventoryItem,
  InventoryItemPayload,
  InventoryImportPreview,
  InventoryImportResult,
  InventoryColor,
  InventoryGroupingPayload,
  InventoryGroupingPreview,
} from '../../features/inventario/models/inventory-item.model';

const VALID_INVENTORY_CATEGORIES = new Set<string>(
  INVENTORY_CATEGORIES.map((category) => category.value),
);

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly itemsState = sessionSignal<InventoryItem[]>([]);
  private readonly loadingState = sessionSignal(false);
  private readonly loadedState = sessionSignal(false);
  private readonly errorState = sessionSignal('');

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

  async saveColor(productId: number, colorId: number | null, payload: Omit<InventoryColor, 'id'>): Promise<InventoryItem> {
    const url = `${API_BASE_URL}/inventory/${productId}/colors/${colorId === null ? '' : `${colorId}/`}`;
    try {
      const options = { headers: this.requireAuthHeaders() };
      const response = await firstValueFrom(colorId === null
        ? this.http.post<InventoryItem>(url, payload, options)
        : this.http.put<InventoryItem>(url, payload, options));
      const item = this.normalizeItem(response);
      this.itemsState.update(items => this.sortItems([...items.filter(existing => existing.id !== item.id), item]));
      return item;
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible guardar el color y sus existencias.'));
    }
  }

  async previewGrouping(payload: InventoryGroupingPayload): Promise<InventoryGroupingPreview> {
    try {
      const preview = await firstValueFrom(this.http.post<InventoryGroupingPreview>(
        `${API_BASE_URL}/inventory/grouping/preview/`, payload, { headers: this.requireAuthHeaders() },
      ));
      return { ...preview, colors: preview.colors.map(color => ({ ...color, quantity: Number(color.quantity) })) };
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible revisar la reorganización del inventario.'));
    }
  }

  async confirmGrouping(token: string): Promise<{ targetProductId: number; grouped: number }> {
    try {
      return await firstValueFrom(this.http.post<{ targetProductId: number; grouped: number }>(
        `${API_BASE_URL}/inventory/grouping/confirm/`, { token }, { headers: this.requireAuthHeaders() },
      ));
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible reorganizar el inventario. Vuelve a revisar los cambios.'));
    }
  }

  async exportExcel(): Promise<Blob> {
    try {
      return await firstValueFrom(this.http.get(`${API_BASE_URL}/inventory/export/excel/`, {
        headers: this.requireAuthHeaders(), responseType: 'blob',
      }));
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible exportar el inventario a Excel.'));
    }
  }

  async previewImport(file: File): Promise<InventoryImportPreview> {
    const body = new FormData();
    body.append('file', file);
    try {
      const preview = await firstValueFrom(this.http.post<InventoryImportPreview>(
        `${API_BASE_URL}/inventory/import/preview/`, body, { headers: this.requireAuthHeaders() },
      ));
      return {
        ...preview,
        colors: (preview.colors ?? []).map(row => ({ ...row, quantity: row.quantity == null ? null : Number(row.quantity) })),
        rows: preview.rows.map(row => ({
          ...row,
          quantity: row.quantity == null ? null : Number(row.quantity),
          unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
          highSeasonPrice: row.highSeasonPrice == null ? null : Number(row.highSeasonPrice),
          replacementCost: row.replacementCost == null ? null : Number(row.replacementCost),
        })),
      };
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible revisar el archivo de Excel.'));
    }
  }

  async confirmImport(token: string): Promise<InventoryImportResult> {
    try {
      return await firstValueFrom(this.http.post<InventoryImportResult>(
        `${API_BASE_URL}/inventory/import/confirm/`, { token }, { headers: this.requireAuthHeaders() },
      ));
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible importar el inventario. Vuelve a revisar el archivo.'));
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
      highSeasonPrice: item.highSeasonPrice == null ? null : Number(item.highSeasonPrice),
      replacementCost: Number(item.replacementCost ?? 0),
      requiresColor: item.requiresColor ?? false,
      isActive: item.isActive ?? true,
      canonicalProductId: item.canonicalProductId == null ? null : Number(item.canonicalProductId),
      colors: (item.colors ?? []).map(color => ({ id: Number(color.id), name: String(color.name), quantity: Number(color.quantity) })),
      category: VALID_INVENTORY_CATEGORIES.has(item.category)
        ? (item.category as InventoryCategory)
        : 'OTROS',
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
