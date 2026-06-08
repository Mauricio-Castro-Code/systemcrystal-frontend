import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { NavigationItem } from '../../core/models/navigation-item.model';
import { SidebarComponent } from '../sidebar/sidebar';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon';

interface NavigationItemDef extends NavigationItem {
  adminOnly?: boolean;
}

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterOutlet, SidebarComponent, AppIconComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly userSession = this.authService.userSession;
  readonly isAdmin = this.authService.isAdmin;
  readonly isSidebarOpen = signal(false);
  readonly activeItemId = computed(() => {
    const url = this.currentUrl();

    if (url.startsWith('/clientes')) return 'clientes';
    if (url.startsWith('/inventario')) return 'inventario';
    if (url.startsWith('/contabilidad')) return 'contabilidad';
    if (url.startsWith('/fletes')) return 'fletes';
    if (url.startsWith('/cotizaciones/nueva')) return 'cotizacion';
    if (url.startsWith('/cotizaciones')) return 'cotizaciones-registro';
    if (url.startsWith('/pedidos/registro')) return 'pedidos-registro';
    if (url.startsWith('/pedidos')) return 'pedidos';

    return 'dashboard';
  });

  private readonly allNavItems: NavigationItemDef[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'users', route: '/clientes' },
    { id: 'inventario', label: 'Inventario', icon: 'boxes', route: '/inventario' },
    { id: 'cotizacion', label: 'Nueva Cotizacion', icon: 'file-plus', route: '/cotizaciones/nueva' },
    { id: 'cotizaciones-registro', label: 'Cotizaciones Activas', icon: 'file-text', route: '/cotizaciones/registro' },
    { id: 'pedidos', label: 'Notas Activas', icon: 'clipboard-list', route: '/pedidos' },
    { id: 'pedidos-registro', label: 'Registro Notas', icon: 'file-text', route: '/pedidos/registro' },
    { id: 'fletes', label: 'Calculador Fletes', icon: 'map-pin', route: '/fletes' },
    { id: 'contabilidad', label: 'Contabilidad', icon: 'bar-chart-2', route: '/contabilidad', adminOnly: true },
  ];

  readonly navigationItems = computed<NavigationItem[]>(() => {
    const admin = this.isAdmin();
    return this.allNavItems.filter((item) => !item.adminOnly || admin);
  });

  toggleSidebar(): void {
    this.isSidebarOpen.update((currentValue) => !currentValue);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.closeSidebar();
    await this.router.navigateByUrl('/login');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 960) {
      this.closeSidebar();
    }
  }
}
