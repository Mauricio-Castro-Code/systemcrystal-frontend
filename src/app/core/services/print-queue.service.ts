import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { SessionStateService, sessionSignal } from './session-state.service';

export interface PrintStatus {
  printedAt: string | null;
  printVersion?: string | null;
  printRequiredAt?: string | null;
  printPostponedAt?: string | null;
  printPostponedReason?: string;
  printPostponedBy?: string | null;
}

export interface PendingPrint extends PrintStatus {
  orderId: string;
  clientName: string;
  printVersion: string;
}

type PrintableRecord = PrintStatus & {
  orderId: string;
  clientName: string;
  isCancelled?: boolean;
  operationalStatus?: string;
};

@Injectable({ providedIn: 'root' })
export class PrintQueueService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionStateService);
  private readonly rows = sessionSignal<PendingPrint[]>([]);
  private readonly errorState = sessionSignal('');
  private revision = 0;
  private deniedToken: string | null = null;
  readonly pending = this.rows.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly required = computed(() => this.rows().filter((row) => !row.printPostponedAt));

  async refresh(force = false): Promise<void> {
    const token = this.auth.getAccessToken();
    if (!force && token && token === this.deniedToken) return;
    if (!this.auth.isAuthenticated() || this.auth.isChofer()) return;
    const generation = this.session.generation();
    const revision = ++this.revision;
    try {
      const rows = await firstValueFrom(
        this.http.get<PendingPrint[]>(`${API_BASE_URL}/orders/print-queue/`, {
          headers: this.headers(),
        }),
      );
      if (generation !== this.session.generation() || revision !== this.revision) return;
      this.rows.set(rows);
      this.deniedToken = null;
      this.errorState.set('');
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        token === this.auth.getAccessToken()
      ) {
        this.deniedToken = token;
        this.errorState.set(
          'Tu cuenta ya no tiene permiso para revisar las impresiones pendientes.',
        );
        return;
      }
      if (generation === this.session.generation() && revision === this.revision) {
        this.errorState.set(
          'No fue posible revisar las impresiones pendientes. Vuelve a intentar.',
        );
      }
    }
  }

  track(record: PrintableRecord): void {
    ++this.revision;
    const rows = this.rows().filter((row) => row.orderId !== record.orderId);
    if (
      record.printVersion &&
      !record.printedAt &&
      !record.isCancelled &&
      record.operationalStatus !== 'RECOGIDO'
    ) {
      rows.push({ ...record, printVersion: record.printVersion });
    }
    this.rows.set(rows);
  }

  remove(orderId: string): void {
    ++this.revision;
    this.rows.update((rows) => rows.filter((row) => row.orderId !== orderId));
  }

  async postpone(row: PendingPrint, reason: string): Promise<PrintStatus> {
    const generation = this.session.generation();
    try {
      const result = await firstValueFrom(
        this.http.post<PrintStatus>(
          `${API_BASE_URL}/orders/${encodeURIComponent(row.orderId)}/print-postpone/`,
          { printVersion: row.printVersion, reason },
          { headers: this.headers() },
        ),
      );
      this.requireSameSession(generation);
      const current = this.rows().find((item) => item.orderId === row.orderId);
      if (!current || current.printVersion !== row.printVersion) {
        throw new Error('La nota cambió. Usa la versión vigente.');
      }
      this.track({ ...row, ...result });
      return result;
    } catch (error) {
      throw this.actionError(error, 'No fue posible posponer la impresión. Inténtalo de nuevo.');
    }
  }

  async getPdf(row: PendingPrint): Promise<Blob> {
    const generation = this.session.generation();
    try {
      const blob = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/orders/${encodeURIComponent(row.orderId)}/export/pdf/`, {
          headers: this.headers(),
          params: { printVersion: row.printVersion },
          responseType: 'blob',
        }),
      );
      this.requireSameSession(generation);
      if (!blob.size || !blob.type.startsWith('application/pdf'))
        throw new Error('El servidor no devolvió un PDF válido. Vuelve a intentar.');
      return blob;
    } catch (error) {
      throw this.actionError(error, 'No fue posible abrir el PDF. Vuelve a intentar.');
    }
  }

  private requireSameSession(generation: number): void {
    if (generation !== this.session.generation())
      throw new Error('La sesión cambió. Vuelve a iniciar sesión.');
  }

  private actionError(error: unknown, fallback: string): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        void this.refresh();
        return new Error('La nota cambió o ya fue atendida. Actualiza y usa la versión vigente.');
      }
      return new Error(fallback);
    }
    return error instanceof Error ? error : new Error(fallback);
  }

  private headers(): HttpHeaders {
    const token = this.auth.getAccessToken();
    if (!token) throw new Error('No hay una sesión activa.');
    return new HttpHeaders({ Authorization: `Token ${token}` });
  }
}
