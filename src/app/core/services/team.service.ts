import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  CreateTeamMemberInput,
  TeamMember,
  UpdateTeamMemberInput,
} from '../../features/equipo/models/team-member.model';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly membersState = signal<TeamMember[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');

  readonly members = this.membersState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();

  async loadMembers(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set('');

    try {
      const members = await firstValueFrom(
        this.http.get<TeamMember[]>(`${API_BASE_URL}/team/`, {
          headers: this.requireAuthHeaders(),
        }),
      );
      this.membersState.set(members);
    } catch (error) {
      this.errorState.set(
        this.resolveHttpError(error, 'No fue posible cargar el equipo.'),
      );
    } finally {
      this.loadingState.set(false);
    }
  }

  async createMember(input: CreateTeamMemberInput): Promise<TeamMember> {
    try {
      const created = await firstValueFrom(
        this.http.post<TeamMember>(`${API_BASE_URL}/team/`, input, {
          headers: this.requireAuthHeaders(),
        }),
      );
      this.membersState.update((members) => [created, ...members]);
      return created;
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible crear el usuario.'));
    }
  }

  async updateMember(id: string, input: UpdateTeamMemberInput): Promise<TeamMember> {
    try {
      const updated = await firstValueFrom(
        this.http.patch<TeamMember>(`${API_BASE_URL}/team/${id}/`, input, {
          headers: this.requireAuthHeaders(),
        }),
      );
      this.membersState.update((members) =>
        members.map((member) => (member.id === id ? updated : member)),
      );
      return updated;
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible actualizar el usuario.'));
    }
  }

  async deleteMember(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${API_BASE_URL}/team/${id}/`, {
          headers: this.requireAuthHeaders(),
        }),
      );
      this.membersState.update((members) => members.filter((member) => member.id !== id));
    } catch (error) {
      throw new Error(this.resolveHttpError(error, 'No fue posible eliminar el usuario.'));
    }
  }

  private requireAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      throw new Error('No hay una sesion activa para administrar el equipo.');
    }

    return new HttpHeaders({ Authorization: `Token ${accessToken}` });
  }

  private resolveHttpError(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error ? error.message : fallbackMessage;
    }

    if (error.status === 401) {
      return 'Tu sesion ya no es valida. Vuelve a iniciar sesion.';
    }

    if (error.status === 403) {
      return 'Solo un administrador puede gestionar el equipo.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend.';
    }

    return this.extractApiMessage(error.error) ?? fallbackMessage;
  }

  private extractApiMessage(payload: unknown): string | null {
    if (typeof payload === 'string' && payload.trim() && !payload.trim().startsWith('<')) {
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
