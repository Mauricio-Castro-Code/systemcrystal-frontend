import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FeaturePlaceholderComponent } from '../../../../shared/components/feature-placeholder/feature-placeholder';

@Component({
  selector: 'app-clientes-page',
  imports: [FeaturePlaceholderComponent],
  templateUrl: './clientes-page.html',
  styleUrl: './clientes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesPageComponent {}
