import { Routes } from '@angular/router';

export const PRODUCTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/productos-page/productos-page').then(
        (module) => module.ProductosPageComponent,
      ),
  },
];
