import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

type ProductsSort = 'qty' | 'revenue';
import { Router } from '@angular/router';

import { AccountingService } from '../../../../core/services/accounting.service';
import {
  AccountingOverview,
  MonthlySalesPoint,
  TopColor,
  TopProduct,
} from '../../models/accounting-overview.model';

@Component({
  selector: 'app-contabilidad-page',
  imports: [CommonModule],
  templateUrl: './contabilidad-page.html',
  styleUrl: './contabilidad-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContabilidadPageComponent implements OnInit {
  private readonly accountingService = inject(AccountingService);
  private readonly router = inject(Router);

  readonly overview = signal<AccountingOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly productsSort = signal<ProductsSort>('qty');

  async ngOnInit(): Promise<void> {
    await this.loadOverview();
  }

  async selectYear(year: number): Promise<void> {
    await this.loadOverview(year);
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/dashboard');
  }

  getMaxValue(points: MonthlySalesPoint[]): number {
    return Math.max(...points.map((p) => p.value), 1);
  }

  setSortProducts(sort: ProductsSort): void {
    this.productsSort.set(sort);
  }

  getSortedProducts(products: TopProduct[]): TopProduct[] {
    const sort = this.productsSort();
    const sorted = [...products].sort((a, b) =>
      sort === 'revenue' ? b.totalRevenue - a.totalRevenue : b.totalQty - a.totalQty,
    );
    return sorted.slice(0, 15);
  }

  getMaxQty(products: TopProduct[]): number {
    return Math.max(...products.map((p) => p.totalQty), 1);
  }

  getMaxRevenue(products: TopProduct[]): number {
    return Math.max(...products.map((p) => p.totalRevenue), 1);
  }

  getMaxCount(colors: TopColor[]): number {
    return Math.max(...colors.map((c) => c.count), 1);
  }

  private static readonly MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  currentMonthLabel(): string {
    const prev = new Date().getMonth() - 1; // mes anterior al actual (el último completo)
    return ContabilidadPageComponent.MONTH_LABELS[prev < 0 ? 11 : prev];
  }

  private static readonly COLOR_HEX: Record<string, string> = {
    blanco:       '#f5f5f5',
    negro:        '#1a1a1a',
    vino:         '#722f37',
    azul:         '#1d2f58',
    'azul rey':   '#2650a0',
    'azul marino':'#001f5b',
    'azul cielo': '#87ceeb',
    'azul turquesa': '#00ced1',
    chocolate:    '#7b3f00',
    plateado:     '#c0c0c0',
    dorado:       '#cfb53b',
    rojo:         '#c0392b',
    rosa:         '#ff91a4',
    'rosa pastel':'#ffd1dc',
    'rosa mexicano':'#e40c78',
    morado:       '#6a0dad',
    lila:         '#b19cd9',
    lavanda:      '#d8b4e2',
    verde:        '#277740',
    'verde menta':'#98ff98',
    amarillo:     '#f4d03f',
    naranja:      '#e67e22',
    gris:         '#95a5a6',
    beige:        '#d4a76a',
    café:         '#7b4f2e',
    champagne:    '#f7e7ce',
    coral:        '#ff6f61',
    salmón:       '#fa8072',
    terracota:    '#c0614e',
    turquesa:     '#00b5ad',
    menta:        '#98ff98',
    marfil:       '#fffff0',
    crema:        '#fffdd0',
    nude:         '#e3bc9a',
    fucsia:       '#ff00aa',
    guinda:       '#6e0b14',
  };

  colorToHex(color: string): string {
    return ContabilidadPageComponent.COLOR_HEX[color.toLowerCase()] ?? '#888888';
  }

  colorIsLight(color: string): boolean {
    const light = new Set(['blanco', 'marfil', 'crema', 'nude', 'champagne', 'beige', 'plateado']);
    return light.has(color.toLowerCase());
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private async loadOverview(year?: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.accountingService.fetchOverview(year);
      this.overview.set(data);
    } catch {
      this.error.set('No fue posible cargar la informacion contable.');
    } finally {
      this.loading.set(false);
    }
  }
}
