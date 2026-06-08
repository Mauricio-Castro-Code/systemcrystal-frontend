import { Routes } from '@angular/router';

import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../../layout/auth-layout/auth-layout').then(
        (module) => module.AuthLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/login-page/login-page').then(
            (module) => module.LoginPageComponent,
          ),
      },
    ],
  },
];
