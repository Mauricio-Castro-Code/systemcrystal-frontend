import { Routes } from '@angular/router';

export const COTIZACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/main-layout/main-layout').then(
        (module) => module.MainLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'nueva',
      },
      {
        path: 'registro',
        loadComponent: () =>
          import('./pages/quotation-records-page/quotation-records-page').then(
            (module) => module.QuotationRecordsPageComponent,
          ),
      },
      {
        path: 'nueva',
        loadComponent: () =>
          import('./pages/new-quotation-page/new-quotation-page').then(
            (module) => module.NewQuotationPageComponent,
          ),
      },
      {
        path: ':quotationId/editar',
        loadComponent: () =>
          import('./pages/new-quotation-page/new-quotation-page').then(
            (module) => module.NewQuotationPageComponent,
          ),
      },
      {
        path: ':quotationId',
        loadComponent: () =>
          import('./pages/quotation-note-page/quotation-note-page').then(
            (module) => module.QuotationNotePageComponent,
          ),
      },
    ],
  },
];
