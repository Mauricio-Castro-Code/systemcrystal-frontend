import { Routes } from '@angular/router';

export const PEDIDOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/main-layout/main-layout').then(
        (module) => module.MainLayoutComponent,
      ),
    children: [
      {
        path: 'registro',
        loadComponent: () =>
          import('./pages/note-archive-page/note-archive-page').then(
            (module) => module.NoteArchivePageComponent,
          ),
      },
      {
        path: 'registro/:orderId',
        loadComponent: () =>
          import('./pages/order-note-page/order-note-page').then(
            (module) => module.OrderNotePageComponent,
          ),
      },
      {
        path: '',
        loadComponent: () =>
          import('./pages/order-records-page/order-records-page').then(
            (module) => module.OrderRecordsPageComponent,
          ),
      },
      {
        path: ':orderId/editar',
        loadComponent: () =>
          import('../cotizaciones/pages/new-quotation-page/new-quotation-page').then(
            (module) => module.NewQuotationPageComponent,
          ),
      },
      {
        path: ':orderId',
        loadComponent: () =>
          import('./pages/order-note-page/order-note-page').then(
            (module) => module.OrderNotePageComponent,
          ),
      },
    ],
  },
];
