import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { QuotationRecordsService } from '../../../../core/services/quotation-records.service';
import { FolioStrategyService } from '../../../../core/services/folio-strategy.service';
import { QuotationNotePageComponent } from './quotation-note-page';

describe('Quotation detail duplication', () => {
  it('opens a new quotation with the source folio when the duplicate button is clicked', async () => {
    await TestBed.configureTestingModule({
      imports: [QuotationNotePageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ quotationId: '001COTI-26' }) } } },
        { provide: FolioStrategyService, useValue: {} },
        { provide: QuotationRecordsService, useValue: {
          loadQuotationById: vi.fn().mockResolvedValue({}),
          getQuotationById: () => ({ quotationId: '001COTI-26', quotation: {
            clientInfo: { fullName: 'Ana' }, schedule: {}, equipmentItems: [], summary: {}, logistics: {},
          } }),
          getQuotationPdfBlob: vi.fn().mockRejectedValue(new Error('No preview')),
        } },
      ],
    }).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(QuotationNotePageComponent);
    await fixture.whenStable();
    const button = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(element => (element as HTMLButtonElement).textContent?.includes('Duplicar cotización')) as HTMLButtonElement;
    expect(button).toBeDefined();
    button.click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/cotizaciones/nueva'], {
      queryParams: { duplicarCotizacionDe: '001COTI-26' },
    });
  });
});
