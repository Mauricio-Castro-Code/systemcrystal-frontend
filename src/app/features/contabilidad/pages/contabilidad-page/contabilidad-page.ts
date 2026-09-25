import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  inject,
  signal,
} from '@angular/core';

type ProductsSort = 'qty' | 'revenue';
type ClientsSort = 'orders' | 'sales';
import { Router } from '@angular/router';

import { AccountingService } from '../../../../core/services/accounting.service';
import {
  AccountingOverview,
  MonthlySalesPoint,
  TopClient,
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
  readonly previousMonthlySales = signal<MonthlySalesPoint[] | null>(null);
  readonly comparisonError = signal(false);
  private loadRequest = 0;
  readonly monthlyComparison = computed(() => {
    const previous = new Map(this.previousMonthlySales()?.map((point) => [point.month, point.value]));
    return (this.overview()?.monthlySales ?? []).map((point) => ({
      ...point,
      previousValue: this.previousMonthlySales() === null ? null : (previous.get(point.month) ?? 0),
    }));
  });
  readonly monthlyComparisonMax = computed(() =>
    Math.max(1, ...this.monthlyComparison().flatMap((point) => [point.value, point.previousValue ?? 0])),
  );
  readonly hasMonthlyComparison = computed(() =>
    this.monthlyComparison().some((point) => point.value > 0 || (point.previousValue ?? 0) > 0),
  );
  readonly productsSort = signal<ProductsSort>('qty');
  readonly clientsSort = signal<ClientsSort>('orders');

  async ngOnInit(): Promise<void> {
    await this.loadOverview();
  }

  async selectYear(year: number): Promise<void> {
    await this.loadOverview(year);
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/dashboard');
  }

  async goToClient(client: TopClient): Promise<void> {
    if (!client.code) {
      return;
    }
    await this.router.navigate(['/clientes', client.code]);
  }

  setSortProducts(sort: ProductsSort): void {
    this.productsSort.set(sort);
  }

  getSortedProducts(products: TopProduct[]): TopProduct[] {
    const sort = this.productsSort();
    const sorted = [...products].sort((a, b) =>
      sort === 'revenue' ? b.totalRevenue - a.totalRevenue : b.totalQty - a.totalQty,
    );
    return sorted.slice(0, 10);
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

  setSortClients(sort: ClientsSort): void {
    this.clientsSort.set(sort);
  }

  getSortedClients(clients: TopClient[]): TopClient[] {
    const sort = this.clientsSort();
    const sorted = [...clients].sort((a, b) =>
      sort === 'sales' ? b.totalSales - a.totalSales : b.orderCount - a.orderCount,
    );
    return sorted.slice(0, 10);
  }

  getMaxOrderCount(clients: TopClient[]): number {
    return Math.max(...clients.map((c) => c.orderCount), 1);
  }

  getMaxSales(clients: TopClient[]): number {
    return Math.max(...clients.map((c) => c.totalSales), 1);
  }

  private static readonly MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  async retry(): Promise<void> {
    await this.loadOverview(this.overview()?.selectedYear);
  }

  comparisonPeriod(generatedAt: string): string {
    const month = Number(generatedAt.slice(5, 7));
    return month === 1 ? 'sin meses completos aún' : `Ene–${ContabilidadPageComponent.MONTH_LABELS[month - 2]}`;
  }

  freightMonthLabel(generatedAt: string): string {
    return ContabilidadPageComponent.MONTH_LABELS[Number(generatedAt.slice(5, 7)) - 1];
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
    const request = ++this.loadRequest;
    this.loading.set(true);
    this.error.set(null);
    this.previousMonthlySales.set(null);
    this.comparisonError.set(false);
    try {
      const data = await this.accountingService.fetchOverview(year);
      if (request !== this.loadRequest) return;
      this.overview.set(data);
      try {
        const previous = await this.accountingService.fetchOverview(data.selectedYear - 1);
        if (request !== this.loadRequest) return;
        this.previousMonthlySales.set(previous.monthlySales);
      } catch {
        if (request === this.loadRequest) this.comparisonError.set(true);
      }
    } catch {
      if (request === this.loadRequest) this.error.set('No fue posible cargar los datos. Intenta nuevamente.');
    } finally {
      if (request === this.loadRequest) this.loading.set(false);
    }
  }
}
