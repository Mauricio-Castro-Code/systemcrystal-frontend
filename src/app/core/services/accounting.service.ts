import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AccountingOverview } from '../../features/contabilidad/models/accounting-overview.model';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AccountingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  async fetchOverview(year?: number): Promise<AccountingOverview> {
    const params = year ? `?year=${year}` : '';
    return firstValueFrom(
      this.http.get<AccountingOverview>(`${API_BASE_URL}/accounting/overview/${params}`, {
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
