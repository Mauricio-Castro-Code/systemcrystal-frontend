import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FeaturePlaceholderComponent } from '../../../../shared/components/feature-placeholder/feature-placeholder';

@Component({
  selector: 'app-cotizaciones-page',
  imports: [FeaturePlaceholderComponent],
  templateUrl: './cotizaciones-page.html',
  styleUrl: './cotizaciones-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionesPageComponent {}
