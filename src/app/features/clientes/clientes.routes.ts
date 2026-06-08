import { Routes } from '@angular/router';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/main-layout/main-layout').then(
        (module) => module.MainLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/clients-page/clients-page').then(
            (module) => module.ClientsPageComponent,
          ),
      },
      {
        path: ':clientId',
        loadComponent: () =>
          import('./pages/client-detail-page/client-detail-page').then(
            (module) => module.ClientDetailPageComponent,
          ),
      },
    ],
  },
];
