import { Routes } from '@angular/router';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/clientes-page/clientes-page').then(
        (module) => module.ClientesPageComponent,
      ),
  },
];
