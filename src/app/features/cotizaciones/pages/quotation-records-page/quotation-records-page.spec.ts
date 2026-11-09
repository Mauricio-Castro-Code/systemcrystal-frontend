import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { QuotationRecordsService } from '../../../../core/services/quotation-records.service';
import { FolioStrategyService } from '../../../../core/services/folio-strategy.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { QuotationRecord } from '../../models/quotation-record.model';
import { QuotationRecordsPageComponent } from './quotation-records-page';

describe('Active quotations', () => {
  const record = (id: string, eventDate: string | null) => ({
    quotationId: id, clientName: id, quotation: { schedule: { eventDate } },
  }) as QuotationRecord;
  const records = signal<QuotationRecord[]>([]);

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 12));
    records.set([]);
    await TestBed.configureTestingModule({
      imports: [QuotationRecordsPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAdmin: signal(false) } },
        { provide: QuotationRecordsService, useValue: {
          quotationRecords: records, isLoading: signal(false), errorMessage: signal(''),
          loadQuotations: vi.fn(),
        } },
        ...[FolioStrategyService, ConfirmService, NotificationService].map(provide => ({ provide, useValue: {} })),
      ],
    }).overrideComponent(QuotationRecordsPageComponent, { set: { template: '' } }).compileComponents();
  });

  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('hides records at three calendar days without removing the originals', () => {
    records.set([record('expired', '2026-11-05'), record('boundary', '2026-11-06'),
      record('recent', '2026-11-07'), record('future', '2026-11-10'), record('undated', null)]);
    const fixture = TestBed.createComponent(QuotationRecordsPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.dataSource.data.map(r => r.quotationId)).toEqual(['recent', 'future', 'undated']);
    expect(records()).toHaveLength(5);
  });

  it('hides an expired quotation while the list stays open across a year boundary', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 30));
    records.set([record('new-year', '2026-12-29')]);
    const fixture = TestBed.createComponent(QuotationRecordsPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.dataSource.data).toHaveLength(1);
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.dataSource.data).toHaveLength(0);
    expect(records()).toHaveLength(1);
  });
});
