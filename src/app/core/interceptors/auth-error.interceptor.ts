import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

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

  return next(req).pipe(
    catchError((error: unknown) => {
      const isSessionExpired =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !EXEMPT_PATHS.some((path) => req.url.includes(path));

      if (isSessionExpired) {
        void authService.signOut().then(() => router.navigateByUrl('/login'));
      }

      return throwError(() => error);
    }),
  );
};
