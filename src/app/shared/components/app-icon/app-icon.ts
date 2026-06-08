import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-icon',
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault],
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  readonly name = input.required<string>();
}
