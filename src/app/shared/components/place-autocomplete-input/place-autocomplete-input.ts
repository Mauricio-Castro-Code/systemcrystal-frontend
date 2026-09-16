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
    this.element.addEventListener('gmp-select', this.onSelect);
    this.containerRef.nativeElement.appendChild(this.element);
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
