import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FeaturePlaceholderComponent } from '../../../../shared/components/feature-placeholder/feature-placeholder';

@Component({
  selector: 'app-productos-page',
  imports: [FeaturePlaceholderComponent],
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosPageComponent {}
