import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  FreightZone,
  FreightZonePayload,
} from '../../features/fletes/models/freight-zone.model';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class FreightZonesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  async fetchAll(): Promise<FreightZone[]> {
    return firstValueFrom(
      this.http.get<FreightZone[]>(`${API_BASE_URL}/freight-zones/`, {
        headers: this.authHeaders(),
      }),
    );
  }

  async create(payload: FreightZonePayload): Promise<FreightZone> {
    return firstValueFrom(
      this.http.post<FreightZone>(`${API_BASE_URL}/freight-zones/`, payload, {
        headers: this.authHeaders(),
      }),
    );
  }

  async update(id: number, payload: FreightZonePayload): Promise<FreightZone> {
    return firstValueFrom(
      this.http.put<FreightZone>(`${API_BASE_URL}/freight-zones/${id}/`, payload, {
        headers: this.authHeaders(),
      }),
    );
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/freight-zones/${id}/`, {
        headers: this.authHeaders(),
      }),
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    if (!token) throw new Error('Sin sesion activa.');
    return new HttpHeaders({ Authorization: `Token ${token}` });
  }
}
