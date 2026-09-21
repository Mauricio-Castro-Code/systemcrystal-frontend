import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';

const SECTION_EXPORTS = {
  clients: { path: 'clients', filename: 'Clientes.xlsx' },
  active: { path: 'orders', filename: 'Notas_Activas.zip' },
  archive: { path: 'orders/archive', filename: 'Registro_Notas.zip' },
} as const;

export type ExportSection = keyof typeof SECTION_EXPORTS;

@Injectable({ providedIn: 'root' })
export class SectionExportService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  async download(section: ExportSection): Promise<void> {
    const token = this.auth.getAccessToken();
    if (!token) throw new Error('Inicia sesión para exportar los datos.');

    const { path, filename } = SECTION_EXPORTS[section];
    let file: Blob;
    try {
      file = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/${path}/export/excel/`, {
          headers: { Authorization: `Token ${token}` },
          responseType: 'blob',
        }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
        throw new Error('Tu sesión no tiene permiso para exportar esta sección.');
      }
      if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
        const detail = await this.readExportError(error.error);
        if (detail) throw new Error(detail);
      }
      throw new Error('No fue posible generar el archivo. Intenta nuevamente.');
    }
    if (!file.size) throw new Error('El servidor devolvió un archivo vacío.');

    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private async readExportError(file: Blob): Promise<string | null> {
    try {
      const body: unknown = JSON.parse(await file.text());
      if (Array.isArray(body) && typeof body[0] === 'string') return body[0];
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        return body.detail;
      }
    } catch {
      // A proxy error may contain HTML instead of the API's JSON response.
    }
    return null;
  }
}
