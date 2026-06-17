import { Routes } from '@angular/router';

export const MI_RUTA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/mi-ruta-page/mi-ruta-page').then((module) => module.MiRutaPageComponent),
  },
];
