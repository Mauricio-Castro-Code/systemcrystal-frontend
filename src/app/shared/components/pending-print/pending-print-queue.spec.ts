import { SessionStateService } from '../../../core/services/session-state.service';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PendingPrint, PrintQueueService } from '../../../core/services/print-queue.service';
import { PendingPrintQueueComponent } from './pending-print-queue';

const note: PendingPrint = {
  orderId: '0001-26',
  clientName: 'Cliente',
  printedAt: null,
  printVersion: 'v1',
};

describe('PendingPrintQueue', () => {
  const pending = signal<PendingPrint[]>([]);
  const userSession = signal<object | null>({ id: 'admin' });
  const refresh = vi.fn();
  const open = vi.fn();
  const closed = new Subject<void>();
  const close = vi.fn(() => closed.next());
  beforeEach(() => {
    vi.clearAllMocks();
    refresh.mockReset();
    pending.set([]);
    userSession.set({ id: 'admin' });
    open.mockReturnValue({ close, afterClosed: () => closed });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { userSession, isChofer: () => false } },
        {
          provide: PrintQueueService,
          useValue: {
            pending,
            required: () => pending().filter((row) => !row.printPostponedAt),
            error: () => '',
            refresh,
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    });
  });

  it('opens required printing with Escape, backdrop and navigation dismissal disabled', () => {
    pending.set([note]);
    const fixture = TestBed.createComponent(PendingPrintQueueComponent);
    fixture.detectChanges();
    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ disableClose: true, closeOnNavigation: false, data: note }),
    );
  });

  it('shows postponed notes without automatically blocking and allows resuming', () => {
    const postponed = { ...note, printPostponedAt: 'today', printPostponedReason: 'Sin papel' };
    pending.set([postponed]);
    const fixture = TestBed.createComponent(PendingPrintQueueComponent);
    fixture.detectChanges();
    expect(open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Sin papel');
    fixture.componentInstance.resume(postponed);
    expect(open).toHaveBeenCalled();
  });

  it('closes a stale dialog when the note changes and opens its current version', () => {
    pending.set([note]);
    const fixture = TestBed.createComponent(PendingPrintQueueComponent);
    fixture.detectChanges();
    pending.set([{ ...note, printVersion: 'v2' }]);
    fixture.detectChanges();
    expect(close).toHaveBeenCalled();
    fixture.detectChanges();
    expect(open.mock.calls.at(-1)?.[1].data.printVersion).toBe('v2');
  });

  it('closes the dialog when the session ends', () => {
    pending.set([note]);
    const fixture = TestBed.createComponent(PendingPrintQueueComponent);
    fixture.detectChanges();
    userSession.set(null);
    fixture.detectChanges();
    expect(close).toHaveBeenCalled();
  });
  it('does not subscribe refresh to session resets caused by access-denied responses', () => {
    refresh.mockImplementation(() => TestBed.inject(SessionStateService).generation());
    const fixture = TestBed.createComponent(PendingPrintQueueComponent);
    fixture.detectChanges();
    const calls = refresh.mock.calls.length;
    TestBed.inject(SessionStateService).reset();
    fixture.detectChanges();
    expect(refresh.mock.calls.length).toBe(calls);
  });
});
