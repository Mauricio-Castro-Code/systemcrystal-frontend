import { Routes } from '@angular/router';

export const COTIZACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cotizaciones-page/cotizaciones-page').then(
        (module) => module.CotizacionesPageComponent,
      ),
  },
];
