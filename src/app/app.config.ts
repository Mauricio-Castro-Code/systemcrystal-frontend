import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TitleStrategy } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { CrystalTitleStrategy } from './core/title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideAnimationsAsync(),
    importProvidersFrom(AppRoutingModule),
    { provide: TitleStrategy, useClass: CrystalTitleStrategy },
  ],
};
