import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavigationItem } from '../../core/models/navigation-item.model';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, AppIconComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly navigationItems = input.required<NavigationItem[]>();
  readonly activeItemId = input.required<string>();
  readonly userName = input('Equipo Crystal Alquiler');
  readonly isMobileOpen = input(false);

  readonly requestClose = output<void>();
  readonly logoutRequested = output<void>();

  trackByItemId(_: number, item: NavigationItem): string {
    return item.id;
  }

  closeOnMobileNavigation(): void {
    this.requestClose.emit();
  }

  requestLogout(): void {
    this.logoutRequested.emit();
  }
}
