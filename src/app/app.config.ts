import {
  ApplicationConfig,
  importProvidersFrom,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TitleStrategy } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { AppRoutingModule } from './app-routing.module';
import { CrystalTitleStrategy } from './core/title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideAnimationsAsync(),
    importProvidersFrom(AppRoutingModule),
    { provide: TitleStrategy, useClass: CrystalTitleStrategy },
    provideServiceWorker('ngsw-worker.js', {
      // Solo activo en producción; en dev no queremos caché del SW.
      enabled: !isDevMode(),
      // Espera a que la app esté estable (o 30s) antes de registrar el SW.
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
