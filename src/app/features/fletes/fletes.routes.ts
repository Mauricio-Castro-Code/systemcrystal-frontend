import { Routes } from '@angular/router';

export const FLETES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/fletes-page/fletes-page').then(
        (m) => m.FletesPgeComponent,
      ),
  },
];
