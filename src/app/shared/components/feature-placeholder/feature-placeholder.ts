import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-feature-placeholder',
  imports: [RouterLink],
  templateUrl: './feature-placeholder.html',
  styleUrl: './feature-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePlaceholderComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly badge = input('En preparacion');
  readonly actionLabel = input<string>();
  readonly actionRoute = input<string>();
}
