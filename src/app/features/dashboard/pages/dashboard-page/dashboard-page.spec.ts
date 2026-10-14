import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { DashboardPageComponent } from './dashboard-page';

describe('DashboardPageComponent date range', () => {
  it('prevents native submission and queries the selected dates', async () => {
    const loadOverview = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { userSession: signal(null) } },
        {
          provide: DashboardService,
          useValue: {
            loadOverview,
            generatedAt: signal(null),
            isLoading: signal(false),
            errorMessage: signal(''),
            stats: signal([]),
            orderGroups: signal([]),
            deliveryRange: signal(null),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();
    loadOverview.mockClear();
    fixture.componentInstance.deliveryDateFromControl.setValue(new Date(2026, 9, 1));
    fixture.componentInstance.deliveryDateToControl.setValue(new Date(2026, 9, 12));
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(loadOverview).toHaveBeenCalledExactlyOnceWith({
      deliveryDateFrom: '2026-10-01',
      deliveryDateTo: '2026-10-12',
    });
  });
});
