import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { QuotationNote } from '../models/quotation-note.model';
import { AuthService } from './auth.service';
import { FolioSelection, OrderRecordsService } from './order-records.service';
import { QuotationRecord } from '../../features/cotizaciones/models/quotation-record.model';
import { OrderRecord } from '../../features/pedidos/models/order-record.model';

interface CreateQuotationRecordInput {
  quotation: QuotationNote;
}

@Injectable({
  providedIn: 'root',
})
export class QuotationRecordsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly orderRecordsService = inject(OrderRecordsService);

  private readonly recordsState = signal<QuotationRecord[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal('');

  readonly quotationRecords = this.recordsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();

  async loadQuotations(force = false): Promise<void> {
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
      const quotations = await firstValueFrom(
        this.http.get<QuotationRecord[]>(`${API_BASE_URL}/quotations/`, {
          headers,
        }),
      );

      this.recordsState.set(
        this.sortRecords(quotations.map((quotation) => this.normalizeRecord(quotation))),
      );
      this.loadedState.set(true);
    } catch (error) {
      this.errorState.set(
        this.resolveHttpError(error, 'No fue posible cargar las cotizaciones reales.'),
      );
    } finally {
      this.loadingState.set(false);
    }
  }

  getQuotationById(quotationId: string): QuotationRecord | undefined {
    return this.recordsState().find((record) => record.quotationId === quotationId);
  }

  async loadQuotationById(
    quotationId: string,
    force = false,
  ): Promise<QuotationRecord | null> {
    if (!force) {
      const cachedRecord = this.getQuotationById(quotationId);

      if (cachedRecord) {
        return cachedRecord;
      }
    }

    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const quotation = await firstValueFrom(
        this.http.get<QuotationRecord>(`${API_BASE_URL}/quotations/${quotationId}/`, {
          headers,
        }),
      );

      return this.upsertQuotationRecord(quotation);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible cargar la cotizacion solicitada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async createDraft(input: CreateQuotationRecordInput): Promise<QuotationRecord> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const createdQuotation = await firstValueFrom(
        this.http.post<QuotationRecord>(`${API_BASE_URL}/quotations/`, input.quotation, {
          headers,
        }),
      );

      this.loadedState.set(true);
      return this.upsertQuotationRecord(createdQuotation);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible guardar la cotizacion.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async updateDraft(quotationId: string, quotation: QuotationNote): Promise<QuotationRecord | null> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const updatedQuotation = await firstValueFrom(
        this.http.put<QuotationRecord>(`${API_BASE_URL}/quotations/${quotationId}/`, quotation, {
          headers,
        }),
      );

      this.loadedState.set(true);
      return this.upsertQuotationRecord(updatedQuotation);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible actualizar la cotizacion solicitada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async deleteDraft(quotationId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      await firstValueFrom(
        this.http.delete<void>(`${API_BASE_URL}/quotations/${quotationId}/`, {
          headers,
        }),
      );

      this.recordsState.update((records) =>
        records.filter((record) => record.quotationId !== quotationId),
      );
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible eliminar la cotizacion seleccionada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async confirmDraftAsOrder(
    quotationId: string,
    folioSelection: FolioSelection = { strategy: 'fill', value: null },
  ): Promise<OrderRecord | null> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const createdOrder = await firstValueFrom(
        this.http.post<OrderRecord>(
          `${API_BASE_URL}/quotations/${quotationId}/confirm/`,
          { folioStrategy: folioSelection.strategy, folioValue: folioSelection.value },
          {
            headers,
          },
        ),
      );

      this.recordsState.update((records) =>
        records.filter((record) => record.quotationId !== quotationId),
      );
      return this.orderRecordsService.upsertOrderRecord(createdOrder);
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible confirmar la cotizacion seleccionada.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async downloadQuotationExcel(quotationId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const response = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/quotations/${quotationId}/export/excel/`, {
          headers,
          observe: 'response',
          responseType: 'blob',
        }),
      );

      this.triggerBrowserDownload(
        response.body,
        this.resolveDownloadFileName(
          response.headers.get('content-disposition'),
          `${quotationId}.xlsx`,
        ),
        'archivo Excel',
      );
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible descargar la cotizacion en Excel.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async getQuotationPdfBlob(quotationId: string): Promise<Blob> {
    const headers = this.requireAuthHeaders();

    try {
      const response = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/quotations/${quotationId}/export/pdf/`, {
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
        'No fue posible generar el PDF de la cotizacion.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  async downloadQuotationPdf(quotationId: string): Promise<void> {
    const headers = this.requireAuthHeaders();
    this.errorState.set('');

    try {
      const response = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/quotations/${quotationId}/export/pdf/`, {
          headers,
          observe: 'response',
          responseType: 'blob',
        }),
      );

      this.triggerBrowserDownload(
        response.body,
        this.resolveDownloadFileName(
          response.headers.get('content-disposition'),
          `${quotationId}.pdf`,
        ),
        'PDF',
      );
    } catch (error) {
      const message = this.resolveHttpError(
        error,
        'No fue posible descargar el PDF de la cotizacion.',
      );
      this.errorState.set(message);
      throw new Error(message);
    }
  }

  private upsertQuotationRecord(record: QuotationRecord): QuotationRecord {
    const normalizedRecord = this.normalizeRecord(record);

    this.recordsState.update((records) =>
      this.sortRecords([
        normalizedRecord,
        ...records.filter(
          (currentRecord) => currentRecord.quotationId !== normalizedRecord.quotationId,
        ),
      ]),
    );

    return normalizedRecord;
  }

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesion activa para administrar cotizaciones.');
    }

    return new HttpHeaders({
      Authorization: `Token ${accessToken}`,
    });
  }

  private normalizeRecord(record: QuotationRecord): QuotationRecord {
    const normalizedQuotation = this.normalizeQuotation(record.quotation, record.clientName);

    return {
      quotationId: String(record.quotationId ?? '').trim(),
      clientName:
        String(record.clientName ?? '').trim() || normalizedQuotation.clientInfo.fullName,
      date: String(record.date ?? '').trim() || new Date().toISOString(),
      totalEstimated: Number(
        record.totalEstimated ?? normalizedQuotation.summary.totalEstimated,
      ),
      quotation: normalizedQuotation,
    };
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

  private sortRecords(records: QuotationRecord[]): QuotationRecord[] {
    return [...records].sort((firstRecord, secondRecord) => {
      const secondDate = Date.parse(secondRecord.date);
      const firstDate = Date.parse(firstRecord.date);

      return secondDate - firstDate;
    });
  }

  private resolveThrownMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible administrar las cotizaciones.';
  }

  private resolveHttpError(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    if (error.status === 401) {
      return 'Tu sesion ya no es valida. Vuelve a iniciar sesion.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend para administrar cotizaciones.';
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

  private resolveDownloadFileName(
    contentDisposition: string | null,
    fallbackFileName: string,
  ): string {
    if (!contentDisposition) {
      return fallbackFileName;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1]?.trim() || fallbackFileName;
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
