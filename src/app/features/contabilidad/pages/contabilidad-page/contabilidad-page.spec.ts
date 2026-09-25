import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountingService } from '../../../../core/services/accounting.service';
import { AccountingOverview } from '../../models/accounting-overview.model';
import { ContabilidadPageComponent } from './contabilidad-page';

function overview(year: number, value: number): AccountingOverview {
  return {
    generatedAt: '2026-09-25T10:00:00-06:00', selectedYear: year, availableYears: [2025, 2026],
    summary: { yearRevenue: value, ytdRevenue: value, prevYtdRevenue: 0, monthRevenue: 0,
      yearFreight: 0, monthFreight: 0, yoyPct: null, prevYear: year - 1,
      totalOrders: 1, yearExtraCosts: 0, yearUtility: value },
    monthlySales: [{ month: 1, label: 'Ene', value, costs: 0, utility: value }],
    topProducts: [], topColors: [], topClients: [],
  };
}

describe('Analytics year comparison', () => {
  const fetchOverview = vi.fn();
  beforeEach(() => {
    fetchOverview.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AccountingService, useValue: { fetchOverview } }],
    });
  });

  function createPage() {
    return TestBed.runInInjectionContext(() => new ContabilidadPageComponent());
  }

  it('loads the preceding year and scales both series together, including a zero current year', async () => {
    fetchOverview.mockResolvedValueOnce(overview(2026, 0)).mockResolvedValueOnce(overview(2025, 200));
    const page = createPage();
    await page.ngOnInit();
    expect(fetchOverview).toHaveBeenNthCalledWith(2, 2025);
    expect(page.monthlyComparison()[0].previousValue).toBe(200);
    expect(page.monthlyComparisonMax()).toBe(200);
    expect(page.hasMonthlyComparison()).toBe(true);
  });

  it('compares a selected historical year to its own preceding year', async () => {
    fetchOverview.mockResolvedValueOnce(overview(2024, 300)).mockResolvedValueOnce(overview(2023, 100));
    const page = createPage();
    await page.selectYear(2024);
    expect(fetchOverview).toHaveBeenNthCalledWith(1, 2024);
    expect(fetchOverview).toHaveBeenNthCalledWith(2, 2023);
    expect(page.monthlyComparisonMax()).toBe(300);
  });

  it('keeps the selected year visible when the previous-year request fails', async () => {
    fetchOverview.mockResolvedValueOnce(overview(2026, 100)).mockRejectedValueOnce(new Error('Unavailable'));
    const page = createPage();
    await page.ngOnInit();
    expect(page.overview()?.selectedYear).toBe(2026);
    expect(page.error()).toBeNull();
    expect(page.comparisonError()).toBe(true);
    expect(page.monthlyComparison()[0].previousValue).toBeNull();
    expect(page.loading()).toBe(false);
  });

  it('shows ten products with either sorting option', () => {
    const products = Array.from({ length: 15 }, (_, index) => ({
      name: `Producto ${index}`, totalQty: index, totalRevenue: 15 - index,
    }));
    const page = createPage();
    expect(page.getSortedProducts(products)).toHaveLength(10);
    expect(page.getSortedProducts(products)[0].name).toBe('Producto 14');
    page.setSortProducts('revenue');
    expect(page.getSortedProducts(products)).toHaveLength(10);
    expect(page.getSortedProducts(products)[0].name).toBe('Producto 0');
  });
});
