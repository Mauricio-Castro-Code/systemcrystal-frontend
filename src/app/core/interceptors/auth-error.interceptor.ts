import { SessionStateService } from '../services/session-state.service';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

// El login/registro maneja sus propios 401 (credenciales inválidas) como error
// de formulario -- no deben disparar un cierre de sesión ni redirigir.
const EXEMPT_PATHS = ['/auth/login/', '/auth/register/'];

/**
 * Si el backend responde 401 (token inválido/expirado) en cualquier otra
 * petición, cierra la sesión local y manda a login -- antes, cualquier
 * pantalla se quedaba mostrando el error sin ninguna forma de salir de ahí.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sessionState = inject(SessionStateService);
  const generation = sessionState.generation();
  const belongsToSession = req.url.startsWith(`${API_BASE_URL}/`) && req.headers.has('Authorization');
  const isStale = () => belongsToSession && generation !== sessionState.generation();

  return next(req).pipe(
    map((event) => {
      if (isStale()) throw new Error('La sesión cambió; respuesta descartada.');
      return event;
    }),
    catchError((error: unknown) => {
      if (isStale()) return throwError(() => new Error('La sesión cambió; respuesta descartada.'));
      if (belongsToSession && error instanceof HttpErrorResponse && error.status === 403) {
        sessionState.reset();
      }
      const isSessionExpired =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith(`${API_BASE_URL}/`) &&
        !EXEMPT_PATHS.some((path) => req.url.includes(path));

      if (isSessionExpired) {
        authService.clearSession();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
