import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Carga perezosa (una sola vez) de la librería "places" del Maps JavaScript API,
 * para el buscador de direcciones tipo Google Maps del diálogo de asignar chofer.
 *
 * Sin `googleMapsBrowserApiKey` configurada, resuelve `null` en vez de fallar --
 * el buscador simplemente no aparece y el link se sigue pudiendo pegar a mano.
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private placesLibraryPromise: Promise<any | null> | null = null;

  loadPlacesLibrary(): Promise<any | null> {
    if (!environment.googleMapsBrowserApiKey) {
      return Promise.resolve(null);
    }

    if (!this.placesLibraryPromise) {
      this.placesLibraryPromise = this.load();
    }
    return this.placesLibraryPromise;
  }

  private async load(): Promise<any | null> {
    try {
      if (!window.google?.maps?.importLibrary) {
        await this.injectScript();
      }
      return await window.google.maps.importLibrary('places');
    } catch {
      return null;
    }
  }

  private injectScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: environment.googleMapsBrowserApiKey,
        libraries: 'places',
        loading: 'async',
        v: 'weekly',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
      document.head.appendChild(script);
    });
  }
}
