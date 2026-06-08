export interface MonthlySalesPoint {
  label: string;
  month: number;
  value: number;
}

export interface TopProduct {
  name: string;
  totalQty: number;
  totalRevenue: number;
}

export interface TopColor {
  color: string;
  count: number;
}

export interface AccountingSummary {
  yearRevenue: number;
  ytdRevenue: number;
  prevYtdRevenue: number;
  monthRevenue: number;
  yoyPct: number | null;
  prevYear: number;
  totalOrders: number;
}

export interface AccountingOverview {
  generatedAt: string;
  selectedYear: number;
  availableYears: number[];
  summary: AccountingSummary;
  monthlySales: MonthlySalesPoint[];
  topProducts: TopProduct[];
  topColors: TopColor[];
}
