import { Routes } from '@angular/router';

export const EQUIPO_ROUTES: Routes = [
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
          import('./pages/equipo-page/equipo-page').then(
            (module) => module.EquipoPageComponent,
          ),
      },
    ],
  },
];
