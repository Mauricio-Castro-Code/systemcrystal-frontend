import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { QuotationNote } from '../models/quotation-note.model';
import { AuthService } from './auth.service';
import {
  OrderBillingStatus,
  OrderOperationalStatus,
  OrderRecord,
  OrderWorkflowEventRecord,
} from '../../features/pedidos/models/order-record.model';

export type FolioStrategy = 'fill' | 'sequential';

export interface FolioGapOption {
  value: number;
  folio: string;
}

export interface FolioOptions {
  yearSuffix: string;
  fillValue: number;
  sequentialValue: number;
  fillFolio: string;
  sequentialFolio: string;
  hasGap: boolean;
  gaps: FolioGapOption[];
}

/**
 * Folio elegido para una nueva nota.
 * - `strategy: 'sequential'` continúa después del último folio.
 * - `strategy: 'fill'` con `value` rellena ese hueco concreto.
 */
export interface FolioSelection {
  strategy: FolioStrategy;
  value: number | null;
}

interface CreateOrderRecordInput {
  quotation: QuotationNote;
  folioSelection?: FolioSelection;
}

interface UpdateOrderStatusesInput {
  operationalStatus?: OrderOperationalStatus;
  billingStatus?: OrderBillingStatus;
  comment?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderRecordsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly recordsState = signal<OrderRecord[]>([]);
  private readonly archivedRecordsState = signal<OrderRecord[]>([]);
  private readonly loadingState = signal(false);
  private readonly archivedLoadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly archivedLoadedState = signal(false);
  private readonly errorState = signal('');
  private readonly archivedErrorState = signal('');

  readonly orderRecords = this.recordsState.asReadonly();
  readonly archivedOrderRecords = this.archivedRecordsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly archivedIsLoading = this.archivedLoadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly archivedErrorMessage = this.archivedErrorState.asReadonly();

  async loadOrders(force = false): Promise<void> {
    if (this.loadingState() || (this.loadedState() && !force)) {
      return;
    }

    let headers: HttpHeaders;

    try {
      headers = this.requireAuthHeaders();
    } catch (error) {
      this.recordsState.set([]);
      this.errorState.set(this.resolveThrownMessage(error));
      return;
    }

    this.loadingState.set(true);
    this.errorState.set('');

    try {
      const orders = await firstValueFrom(
        this.http.get<OrderRecord[]>(`${API_BASE_URL}/orders/`, {
          headers,
        }),
      );

      this.recordsState.set(
        this.sortRecords(orders.map((order) => this.normalizeRecord(order))),
      );
      this.loadedState.set(true);
    } catch (error) {
      this.errorState.set(
        this.resolveHttpError(error, 'No fue posible cargar las notas activas reales.'),
      );
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadArchivedOrders(force = false): Promise<void> {
    if (this.archivedLoadingState() || (this.archivedLoadedState() && !force)) {
      return;
    }

    let headers: HttpHeaders;

    try {
      headers = this.requireAuthHeaders();
    } catch (error) {
      this.archivedRecordsState.set([]);
      this.archivedErrorState.set(this.resolveThrownMessage(error));
      return;
    }

    this.archivedLoadingState.set(true);
    this.archivedErrorState.set('');

    try {
      const orders = await firstValueFrom(
        this.http.get<OrderRecord[]>(`${API_BASE_URL}/orders/archive/`, {
          headers,
        }),
      );

      this.archivedRecordsState.set(
        this.sortRecords(orders.map((order) => this.normalizeRecord(order))),
      );
      this.archivedLoadedState.set(true);
    } catch (error) {
      this.archivedErrorState.set(
        this.resolveHttpError(error, 'No fue posible cargar el archivo real de notas.'),
      );
    } finally {
      this.archivedLoadingState.set(false);
    }
  }

  getOrderById(orderId: string): OrderRecord | undefined {
    return (
      this.recordsState().find((record) => record.orderId === orderId) ??
      this.archivedRecordsState().find((record) => record.orderId === orderId)
    );
  }

  async loadOrderById(orderId: string, force = false): Promise<OrderRecord | null> {
    if (!force) {
      const cachedRecord = this.getOrderById(orderId);

      if (cachedRecord) {
        return cachedRecord;
      }
    }

    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const order = await firstValueFrom(
        this.http.get<OrderRecord>(`${API_BASE_URL}/orders/${orderId}/`, {
          headers,
        }),
      );

      return this.upsertOrderRecord(order);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible cargar la nota solicitada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async getFolioOptions(): Promise<FolioOptions> {
    const headers = this.requireAuthHeaders();

    return firstValueFrom(
      this.http.get<FolioOptions>(`${API_BASE_URL}/orders/folio-options/`, {
        headers,
      }),
    );
  }

  async createConfirmedOrder(input: CreateOrderRecordInput): Promise<OrderRecord> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const selection = input.folioSelection ?? { strategy: 'fill', value: null };
      const createdOrder = await firstValueFrom(
        this.http.post<OrderRecord>(
          `${API_BASE_URL}/orders/`,
          {
            ...input.quotation,
            folioStrategy: selection.strategy,
            folioValue: selection.value,
          },
          { headers },
        ),
      );

      this.loadedState.set(true);
      return this.upsertOrderRecord(createdOrder);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible guardar la nota del pedido.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async importOrderFromExcel(file: File): Promise<OrderRecord> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    const formData = new FormData();
    formData.append('file', file, file.name);

    try {
      const createdOrder = await firstValueFrom(
        this.http.post<OrderRecord>(`${API_BASE_URL}/orders/import/`, formData, {
          headers,
        }),
      );

      this.loadedState.set(true);
      return this.upsertOrderRecord(createdOrder);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible importar la nota desde el Excel.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async updateOrder(orderId: string, quotation: QuotationNote): Promise<OrderRecord | null> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const updatedOrder = await firstValueFrom(
        this.http.put<OrderRecord>(`${API_BASE_URL}/orders/${orderId}/`, quotation, {
          headers,
        }),
      );

      this.loadedState.set(true);
      return this.upsertOrderRecord(updatedOrder);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible actualizar la nota solicitada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async updateOrderStatuses(
    orderId: string,
    input: UpdateOrderStatusesInput,
  ): Promise<OrderRecord> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const updatedOrder = await firstValueFrom(
        this.http.post<OrderRecord>(`${API_BASE_URL}/orders/${orderId}/status/`, input, {
          headers,
        }),
      );

      return this.upsertOrderRecord(updatedOrder);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible actualizar el estado operativo de la nota.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async assignOrder(
    orderId: string,
    input: { driverId?: number | null; mapsUrl?: string },
  ): Promise<OrderRecord> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const updatedOrder = await firstValueFrom(
        this.http.post<OrderRecord>(`${API_BASE_URL}/orders/${orderId}/assign/`, input, {
          headers,
        }),
      );

      return this.upsertOrderRecord(updatedOrder);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible asignar el chofer o la ubicación de la nota.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      await firstValueFrom(
        this.http.delete<void>(`${API_BASE_URL}/orders/${orderId}/`, {
          headers,
        }),
      );

      this.recordsState.update((records) =>
        records.filter((record) => record.orderId !== orderId),
      );
      this.archivedRecordsState.update((records) =>
        records.filter((record) => record.orderId !== orderId),
      );
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible eliminar la nota seleccionada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async renameOrder(orderId: string, newOrderId: string): Promise<OrderRecord> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const updatedOrder = await firstValueFrom(
        this.http.patch<OrderRecord>(`${API_BASE_URL}/orders/${orderId}/rename/`, { newOrderId }, { headers }),
      );

      // Remove old ID entry before inserting the renamed record
      this.recordsState.update((records) => records.filter((r) => r.orderId !== orderId));
      this.archivedRecordsState.update((records) => records.filter((r) => r.orderId !== orderId));

      return this.upsertOrderRecord(updatedOrder);
    } catch (error) {
      const message = this.resolveHttpError(error, 'No fue posible renombrar la nota.');
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async setCancelled(orderId: string, cancel: boolean): Promise<void> {
    const headers = this.requireAuthHeaders();
    const req$ = cancel
      ? this.http.post<{ isCancelled: boolean }>(`${API_BASE_URL}/orders/${orderId}/cancel/`, {}, { headers })
      : this.http.delete<{ isCancelled: boolean }>(`${API_BASE_URL}/orders/${orderId}/cancel/`, { headers });

    await firstValueFrom(req$);

    const patch = (records: OrderRecord[]) =>
      records.map((r) => (r.orderId === orderId ? { ...r, isCancelled: cancel } : r));
    this.recordsState.update(patch);
    this.archivedRecordsState.update(patch);
  }

  async updateMultipleOrderStatuses(
    orderIds: string[],
    input: UpdateOrderStatusesInput,
  ): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      await firstValueFrom(
        this.http.post<void>(`${API_BASE_URL}/orders/bulk-update-status/`, {
          orderIds,
          ...input,
        }, { headers }),
      );

      const patch = (records: OrderRecord[]) =>
        records.map((r) =>
          orderIds.includes(r.orderId)
            ? {
                ...r,
                operationalStatus: input.operationalStatus ?? r.operationalStatus,
                operationalStatusLabel: input.operationalStatus
                  ? this.resolveOperationalStatusLabel(input.operationalStatus as OrderOperationalStatus)
                  : r.operationalStatusLabel,
                billingStatus: input.billingStatus ?? r.billingStatus,
                billingStatusLabel: input.billingStatus
                  ? this.resolveBillingStatusLabel(input.billingStatus as OrderBillingStatus)
                  : r.billingStatusLabel,
              }
            : r,
        );
      this.recordsState.update(patch);
      this.archivedRecordsState.update(patch);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible actualizar el estado de las notas seleccionadas.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async downloadOrderExcel(orderId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const response = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/orders/${orderId}/export/excel/`, {
          headers,
          observe: 'response',
          responseType: 'blob',
        }),
      );

      // El nombre del archivo es siempre el folio (no dependemos del header
      // Content-Disposition, que entre dominios no se expone al navegador).
      this.triggerBrowserDownload(response.body, `${orderId}.xlsx`, 'archivo Excel');
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible descargar la nota en Excel.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async getOrderPdfBlob(orderId: string): Promise<Blob> {
    const headers = this.requireAuthHeaders();

    try {
      const response = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/orders/${orderId}/export/pdf/`, {
          headers,
          observe: 'response',
          responseType: 'blob',
        }),
      );

      if (!response.body) {
        throw new Error('El backend no devolvio ningun PDF.');
      }

      return response.body;
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible generar el PDF de la nota.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async downloadOrderPdf(orderId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const response = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/orders/${orderId}/export/pdf/`, {
          headers,
          observe: 'response',
          responseType: 'blob',
        }),
      );

      // El nombre del archivo es siempre el folio (no dependemos del header
      // Content-Disposition, que entre dominios no se expone al navegador).
      this.triggerBrowserDownload(response.body, `${orderId}.pdf`, 'PDF');
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible descargar el PDF de la nota.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  upsertOrderRecord(record: OrderRecord): OrderRecord {
    const normalizedRecord = this.normalizeRecord(record);
    const isArchivedRecord = this.isArchivedRecord(normalizedRecord);

    this.recordsState.update((records) =>
      records.filter((currentRecord) => currentRecord.orderId !== normalizedRecord.orderId),
    );
    this.archivedRecordsState.update((records) =>
      records.filter((currentRecord) => currentRecord.orderId !== normalizedRecord.orderId),
    );

    if (isArchivedRecord) {
      this.archivedRecordsState.update((records) =>
        this.sortRecords([normalizedRecord, ...records]),
      );
    } else {
      this.recordsState.update((records) =>
        this.sortRecords([normalizedRecord, ...records]),
      );
    }

    return normalizedRecord;
  }

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesion activa para administrar notas.');
    }

    return new HttpHeaders({
      Authorization: `Token ${accessToken}`,
    });
  }

  private normalizeRecord(record: OrderRecord): OrderRecord {
    const normalizedQuotation = this.normalizeQuotation(record.quotation, record.clientName);
    const operationalStatus = this.normalizeOperationalStatus(record.operationalStatus);
    const billingStatus = this.normalizeBillingStatus(record.billingStatus);

    return {
      orderId: String(record.orderId ?? '').trim(),
      clientName:
        String(record.clientName ?? '').trim() || normalizedQuotation.clientInfo.fullName,
      date: String(record.date ?? '').trim() || new Date().toISOString(),
      status: 'Confirmado',
      operationalStatus,
      operationalStatusLabel:
        String(record.operationalStatusLabel ?? '').trim() ||
        this.resolveOperationalStatusLabel(operationalStatus),
      billingStatus,
      billingStatusLabel:
        String(record.billingStatusLabel ?? '').trim() ||
        this.resolveBillingStatusLabel(billingStatus),
      folderKeys: this.normalizeFolderKeys(record.folderKeys, operationalStatus, billingStatus),
      folderLabels: this.normalizeFolderLabels(
        record.folderLabels,
        operationalStatus,
        billingStatus,
      ),
      totalEstimated: Number(record.totalEstimated ?? normalizedQuotation.summary.totalEstimated),
      isCancelled: record.isCancelled === true,
      mapsUrl: String(record.mapsUrl ?? '').trim(),
      assignedDriver: record.assignedDriver ?? null,
      quotation: normalizedQuotation,
      workflowHistory: this.normalizeWorkflowHistory(record.workflowHistory),
    };
  }

  private normalizeOperationalStatus(
    value: OrderOperationalStatus | string | null | undefined,
  ): OrderOperationalStatus {
    const normalizedValue = String(value ?? '').trim().toUpperCase();

    switch (normalizedValue) {
      case 'EN_CAMINO':
      case 'ENTREGADO':
      case 'POR_RECOGER':
      case 'CLIENTE_ENTREGA':
      case 'RECOGIDO':
        return normalizedValue;
      default:
        return 'PROGRAMADA';
    }
  }

  private normalizeBillingStatus(
    value: OrderBillingStatus | string | null | undefined,
  ): OrderBillingStatus {
    const normalizedValue = String(value ?? '').trim().toUpperCase();

    switch (normalizedValue) {
      case 'POR_COBRAR':
      case 'COBRADO':
        return normalizedValue;
      default:
        return 'AL_CORRIENTE';
    }
  }

  private resolveOperationalStatusLabel(status: OrderOperationalStatus): string {
    const labels: Record<OrderOperationalStatus, string> = {
      PROGRAMADA: 'Programada',
      EN_CAMINO: 'En camino',
      ENTREGADO: 'Entregado',
      POR_RECOGER: 'En Ruta',
      CLIENTE_ENTREGA: 'Cliente entrega',
      RECOGIDO: 'Recogido',
    };

    return labels[status];
  }

  private resolveBillingStatusLabel(status: OrderBillingStatus): string {
    const labels: Record<OrderBillingStatus, string> = {
      AL_CORRIENTE: 'Al corriente',
      POR_COBRAR: 'Por cobrar',
      COBRADO: 'Cobrado',
    };

    return labels[status];
  }

  private normalizeFolderKeys(
    folderKeys: string[] | null | undefined,
    operationalStatus: OrderOperationalStatus,
    billingStatus: OrderBillingStatus,
  ): string[] {
    if (Array.isArray(folderKeys) && folderKeys.length > 0) {
      return [
        ...new Set(
          folderKeys
            .map((folderKey) => String(folderKey ?? '').trim().toLowerCase())
            .filter(Boolean),
        ),
      ];
    }

    const operationalFolderKey = operationalStatus.toLowerCase().replaceAll('_', '-');
    const derivedFolderKeys = [operationalFolderKey];

    if (billingStatus === 'POR_COBRAR') {
      derivedFolderKeys.push('por-cobrar');
    } else if (billingStatus === 'COBRADO') {
      derivedFolderKeys.push('pagado');
    }

    return derivedFolderKeys;
  }

  private normalizeFolderLabels(
    folderLabels: string[] | null | undefined,
    operationalStatus: OrderOperationalStatus,
    billingStatus: OrderBillingStatus,
  ): string[] {
    if (Array.isArray(folderLabels) && folderLabels.length > 0) {
      return [
        ...new Set(
          folderLabels
            .map((folderLabel) => String(folderLabel ?? '').trim())
            .filter(Boolean),
        ),
      ];
    }

    const derivedFolderLabels = [
      this.resolveOperationalStatusLabel(operationalStatus),
    ];

    if (billingStatus === 'POR_COBRAR') {
      derivedFolderLabels.push('Por cobrar');
    } else if (billingStatus === 'COBRADO') {
      derivedFolderLabels.push('Pagado');
    }

    return derivedFolderLabels;
  }

  private normalizeWorkflowHistory(
    workflowHistory: OrderWorkflowEventRecord[] | null | undefined,
  ): OrderWorkflowEventRecord[] {
    if (!Array.isArray(workflowHistory)) {
      return [];
    }

    return workflowHistory.map((event) => ({
      id: Number(event?.id ?? 0),
      category: event?.category === 'BILLING' ? 'BILLING' : 'OPERATIONAL',
      categoryLabel: String(event?.categoryLabel ?? '').trim() || 'Movimiento',
      fromStatus: String(event?.fromStatus ?? '').trim(),
      fromStatusLabel: String(event?.fromStatusLabel ?? '').trim() || 'Sin estado previo',
      toStatus: String(event?.toStatus ?? '').trim(),
      toStatusLabel: String(event?.toStatusLabel ?? '').trim() || 'Sin estado',
      comment: String(event?.comment ?? '').trim(),
      createdAt: String(event?.createdAt ?? '').trim() || new Date().toISOString(),
      changedBy: String(event?.changedBy ?? '').trim() || 'Sistema',
    }));
  }

  private normalizeQuotation(
    quotation: Partial<QuotationNote> | null | undefined,
    fallbackClientName = 'Cliente sin nombre',
  ): QuotationNote {
    const applyTax = Boolean(quotation?.logistics?.applyTax ?? false);
    const equipmentItems = Array.isArray(quotation?.equipmentItems)
      ? quotation.equipmentItems.map((item) => {
          const quantity = Number(item?.quantity ?? 0);
          const unitPrice = Number(item?.unitPrice ?? 0);

          return {
            quantity,
            equipment: String(item?.equipment ?? '').trim(),
            unitPrice,
            total: Number(item?.total ?? quantity * unitPrice),
          };
        })
      : [];

    const subtotalFromItems = equipmentItems.reduce((runningTotal, item) => {
      return runningTotal + item.total;
    }, 0);
    const subtotal =
      equipmentItems.length > 0
        ? subtotalFromItems
        : Number(quotation?.summary?.subtotal ?? 0);
    const freight = Number(quotation?.logistics?.freight ?? quotation?.summary?.freight ?? 0);
    const taxAmount = applyTax
      ? Number(quotation?.summary?.taxAmount ?? (subtotal + freight) * 0.16)
      : 0;
    const securityDeposit = Number(
      quotation?.logistics?.securityDeposit ?? quotation?.summary?.securityDeposit ?? 0,
    );
    const discount = Number(quotation?.summary?.discount ?? 0);
    const advancePayment = Number(quotation?.summary?.advancePayment ?? 0);
    const totalEstimated =
      equipmentItems.length > 0
        ? subtotal + freight + taxAmount + securityDeposit
        : Number(
            quotation?.summary?.totalEstimated
              ?? subtotal + freight + taxAmount + securityDeposit,
          );
    const balanceDue = Number(
      quotation?.summary?.balanceDue ?? totalEstimated - discount - advancePayment,
    );

    return {
      clientInfo: {
        fullName:
          String(quotation?.clientInfo?.fullName ?? '').trim() || fallbackClientName,
        phoneNumber: String(quotation?.clientInfo?.phoneNumber ?? '').trim(),
        birthDate: quotation?.clientInfo?.birthDate ?? null,
        address: String(quotation?.clientInfo?.address ?? '').trim(),
        neighborhood: String(quotation?.clientInfo?.neighborhood ?? '').trim(),
        reference: String(quotation?.clientInfo?.reference ?? '').trim(),
        deliveryInstructions: String(
          quotation?.clientInfo?.deliveryInstructions ?? '',
        ).trim(),
      },
      schedule: {
        deliveryDate: quotation?.schedule?.deliveryDate ?? null,
        eventDate: quotation?.schedule?.eventDate ?? null,
        collectionDate: quotation?.schedule?.collectionDate ?? null,
      },
      logistics: {
        freight,
        securityDeposit,
        applyTax,
      },
      equipmentItems,
      summary: {
        subtotal,
        freight,
        taxAmount,
        securityDeposit,
        discount,
        advancePayment,
        totalEstimated,
        balanceDue,
      },
    };
  }

  private sortRecords(records: OrderRecord[]): OrderRecord[] {
    return [...records].sort((firstRecord, secondRecord) => {
      const secondDate = Date.parse(secondRecord.date);
      const firstDate = Date.parse(firstRecord.date);

      return secondDate - firstDate;
    });
  }

  private isArchivedRecord(record: OrderRecord): boolean {
    return record.operationalStatus === 'RECOGIDO';
  }

  private resolveThrownMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible administrar las notas.';
  }

  private resolveHttpError(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 401) {
      return 'Tu sesion ya no es valida. Vuelve a iniciar sesion.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend para administrar notas.';
    }

    return this.extractApiMessage(error.error) ?? fallbackMessage;
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

  private triggerBrowserDownload(
    file: Blob | null,
    fileName: string,
    fileLabel = 'archivo',
  ): void {
    if (!file) {
      throw new Error(`El backend no devolvio ningun ${fileLabel}.`);
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const objectUrl = window.URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(objectUrl);
  }
}
