import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { LoginCredentials } from '../../features/auth/models/login-credentials.model';
import { RegisterCredentials } from '../../features/auth/models/register-credentials.model';
import { UserSession } from '../models/user-session.model';
import { API_BASE_URL } from '../config/api.config';

const ORDERFLOW_SESSION_KEY = 'orderflow.session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<UserSession | null>(this.loadStoredSession());

  readonly userSession = this.session.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.session()?.isAdmin === true);

  async signIn(credentials: LoginCredentials): Promise<UserSession> {
    return this.requestSession('/auth/login/', credentials);
  }

  async register(credentials: RegisterCredentials): Promise<UserSession> {
    return this.requestSession('/auth/register/', credentials);
  }

  async signOut(): Promise<void> {
    const currentSession = this.session();

    try {
      if (currentSession) {
        await firstValueFrom(
          this.http.post(
            `${API_BASE_URL}/auth/logout/`,
            {},
            {
              headers: new HttpHeaders({
                Authorization: `Token ${currentSession.token}`,
              }),
            },
          ),
        );
      }
    } catch {
      // El cierre local no debe quedar bloqueado si el backend no responde.
    } finally {
      this.session.set(null);
      this.clearPersistedSession();
    }
  }

  getAccessToken(): string | null {
    return this.session()?.token ?? null;
  }

  private async requestSession(
    endpoint: string,
    payload: LoginCredentials | RegisterCredentials,
  ): Promise<UserSession> {
    try {
      const userSession = await firstValueFrom(
        this.http.post<UserSession>(`${API_BASE_URL}${endpoint}`, payload),
      );

      this.session.set(userSession);
      this.persistSession(userSession);

      return userSession;
    } catch (error) {
      throw new Error(this.resolveAuthErrorMessage(error));
    }
  }

  private loadStoredSession(): UserSession | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const persistedSession = localStorage.getItem(ORDERFLOW_SESSION_KEY);

    if (!persistedSession) {
      return null;
    }

    try {
      return JSON.parse(persistedSession) as UserSession;
    } catch {
      this.clearPersistedSession();
      return null;
    }
  }

  private persistSession(userSession: UserSession): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(ORDERFLOW_SESSION_KEY, JSON.stringify(userSession));
  }

  private clearPersistedSession(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(ORDERFLOW_SESSION_KEY);
  }

  private resolveAuthErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible completar la solicitud de acceso.';
    }

    const serverMessage = this.extractServerErrorMessage(error.error);

    if (serverMessage) {
      return serverMessage;
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el backend de autenticacion.';
    }

    return 'No fue posible completar la solicitud de acceso.';
  }

  private extractServerErrorMessage(errorPayload: unknown): string | null {
    if (typeof errorPayload === 'string' && errorPayload.trim()) {
      return errorPayload.trim();
    }

    if (!errorPayload || typeof errorPayload !== 'object') {
      return null;
    }

    const firstEntry = Object.values(errorPayload as Record<string, unknown>)[0];

    if (typeof firstEntry === 'string' && firstEntry.trim()) {
      return firstEntry.trim();
    }

    if (Array.isArray(firstEntry) && typeof firstEntry[0] === 'string') {
      return firstEntry[0];
    }

    return null;
  }
}
