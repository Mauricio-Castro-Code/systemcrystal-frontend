import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
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
          import('./pages/dashboard-page/dashboard-page').then(
            (module) => module.DashboardPageComponent,
          ),
      },
    ],
  },
];
