import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
} from '@angular/core';

import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';

export interface PlaceSelection {
  mapsUrl: string;
  formattedAddress: string;
}

/**
 * Buscador de direcciones tipo "search de Google Maps": mientras se escribe,
 * Google sugiere lugares reales; al elegir uno, emite su ubicación exacta.
 *
 * Envuelve el web component oficial `PlaceAutocompleteElement` (Places API nueva).
 * Si no hay API key de navegador configurada, no renderiza nada -- el formulario
 * que lo use debe seguir aceptando pegar un link a mano como respaldo.
 */
@Component({
  selector: 'app-place-autocomplete-input',
  imports: [],
  templateUrl: './place-autocomplete-input.html',
  styleUrl: './place-autocomplete-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceAutocompleteInputComponent implements AfterViewInit, OnDestroy {
  private readonly loader = inject(GoogleMapsLoaderService);

  readonly placeholder = input('Busca la dirección…');
  // Texto con el que arranca la búsqueda (ej. la dirección ya escrita en la
  // nota), para no obligar a retipearla desde cero.
  readonly initialValue = input('');

  readonly placeSelected = output<PlaceSelection>();

  @ViewChild('container', { static: true }) private readonly containerRef!: ElementRef<HTMLDivElement>;

  private element: any = null;
  private readonly onSelect = (event: any) => void this.handleSelect(event);

  async ngAfterViewInit(): Promise<void> {
    const places = await this.loader.loadPlacesLibrary();
    if (!places) {
      return;
    }

    this.element = new places.PlaceAutocompleteElement({
      includedRegionCodes: ['mx'],
    });
    this.element.placeholder = this.placeholder();
    if (this.initialValue()) {
      this.element.value = this.initialValue();
    }
    this.element.addEventListener('gmp-select', this.onSelect);
    this.containerRef.nativeElement.appendChild(this.element);
    this.forceDropdownAboveDialog();
  }

  // El menú de sugerencias vive dentro del shadow DOM del propio componente,
  // posicionado en relación a sí mismo -- dentro de un diálogo de Material
  // (que recorta/transforma su contenido) puede quedar cortado o tapado.
  // Si el shadow root queda abierto (comportamiento actual del componente),
  // le inyectamos una regla para que se dibuje por encima de todo. Si en el
  // futuro Google lo cierra, esto simplemente no aplica (no rompe nada).
  private forceDropdownAboveDialog(): void {
    const shadowRoot: ShadowRoot | null = this.element?.shadowRoot ?? null;
    if (!shadowRoot) {
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      .predictions-anchor, .dropdown {
        position: fixed !important;
        z-index: 9999 !important;
      }
    `;
    shadowRoot.appendChild(style);
  }

  ngOnDestroy(): void {
    this.element?.removeEventListener('gmp-select', this.onSelect);
  }

  private async handleSelect(event: any): Promise<void> {
    const prediction = event?.placePrediction;
    if (!prediction) {
      return;
    }

    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['location', 'formattedAddress'] });

    const location = place.location;
    if (!location) {
      return;
    }

    this.placeSelected.emit({
      mapsUrl: `https://www.google.com/maps/?q=${location.lat()},${location.lng()}`,
      formattedAddress: place.formattedAddress ?? '',
    });
  }
}
