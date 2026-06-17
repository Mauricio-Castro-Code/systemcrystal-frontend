import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { choferGuard } from './core/guards/chofer.guard';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    title: 'Acceso',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((module) => module.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    title: 'Dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (module) => module.DASHBOARD_ROUTES,
      ),
  },
  {
    path: 'clientes',
    title: 'Clientes',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/clientes/clientes.routes').then(
        (module) => module.CLIENTES_ROUTES,
      ),
  },
  {
    path: 'inventario',
    title: 'Inventario',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/inventario/inventario.routes').then(
        (module) => module.INVENTARIO_ROUTES,
      ),
  },
  {
    path: 'cotizaciones',
    title: 'Cotizaciones',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/cotizaciones/cotizaciones.routes').then(
        (module) => module.COTIZACIONES_ROUTES,
      ),
  },
  {
    path: 'pedidos',
    title: 'Notas',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/pedidos/pedidos.routes').then(
        (module) => module.PEDIDOS_ROUTES,
      ),
  },
  {
    path: 'contabilidad',
    title: 'Contabilidad',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/contabilidad/contabilidad.routes').then(
        (module) => module.CONTABILIDAD_ROUTES,
      ),
  },
  {
    path: 'equipo',
    title: 'Equipo',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/equipo/equipo.routes').then(
        (module) => module.EQUIPO_ROUTES,
      ),
  },
  {
    path: 'fletes',
    title: 'Fletes',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/fletes/fletes.routes').then(
        (module) => module.FLETES_ROUTES,
      ),
  },
  {
    path: 'mi-ruta',
    title: 'Mi Ruta',
    canActivate: [choferGuard],
    loadChildren: () =>
      import('./features/mi-ruta/mi-ruta.routes').then(
        (module) => module.MI_RUTA_ROUTES,
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
