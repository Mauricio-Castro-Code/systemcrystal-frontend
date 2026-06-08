import { Routes } from '@angular/router';

export const INVENTARIO_ROUTES: Routes = [
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
          import('./pages/inventory-page/inventory-page').then(
            (module) => module.InventoryPageComponent,
          ),
      },
    ],
  },
];
