import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((module) => module.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (module) => module.DASHBOARD_ROUTES,
      ),
  },
  {
    path: 'clientes',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/clientes/clientes.routes').then(
        (module) => module.CLIENTES_ROUTES,
      ),
  },
  {
    path: 'inventario',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/inventario/inventario.routes').then(
        (module) => module.INVENTARIO_ROUTES,
      ),
  },
  {
    path: 'cotizaciones',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/cotizaciones/cotizaciones.routes').then(
        (module) => module.COTIZACIONES_ROUTES,
      ),
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/pedidos/pedidos.routes').then(
        (module) => module.PEDIDOS_ROUTES,
      ),
  },
  {
    path: 'contabilidad',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/contabilidad/contabilidad.routes').then(
        (module) => module.CONTABILIDAD_ROUTES,
      ),
  },
  {
    path: 'fletes',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/fletes/fletes.routes').then(
        (module) => module.FLETES_ROUTES,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, {
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
