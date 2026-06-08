import { Routes } from '@angular/router';

export const CONTABILIDAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/contabilidad-page/contabilidad-page').then(
        (m) => m.ContabilidadPageComponent,
      ),
  },
];
