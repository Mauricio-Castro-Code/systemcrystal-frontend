import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { PrintQueueService } from '../../../core/services/print-queue.service';
import { OrderRecordsService } from '../../../core/services/order-records.service';
import { PendingPrintDialogComponent } from './pending-print-dialog';

const note = {
  orderId: '0001-26',
  clientName: 'Cliente',
  printedAt: null,
  printVersion: 'version-1',
};

describe('PendingPrintDialog', () => {
  const close = vi.fn();
  const postpone = vi.fn();
  const setPrinted = vi.fn();
  const getPdf = vi.fn();
  const isAdmin = signal(true);
  beforeEach(() => {
    vi.resetAllMocks();
    isAdmin.set(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: note },
        { provide: MatDialogRef, useValue: { close } },
        { provide: AuthService, useValue: { isAdmin } },
        { provide: PrintQueueService, useValue: { postpone, getPdf, refresh: vi.fn() } },
        { provide: OrderRecordsService, useValue: { setPrinted, applyPrintStatus: vi.fn() } },
      ],
    });
  });

  it('requires explicit physical-print confirmation and saves the current version', async () => {
    const component = TestBed.createComponent(PendingPrintDialogComponent).componentInstance;
    await component.confirmPrinted();
    expect(setPrinted).not.toHaveBeenCalled();
    component.confirmed.set(true);
    setPrinted.mockResolvedValue(undefined);
    await component.confirmPrinted();
    expect(setPrinted).toHaveBeenCalledWith('0001-26', true, 'version-1');
    expect(close).toHaveBeenCalled();
  });

  it('keeps the dialog open if confirming printing fails', async () => {
    const component = TestBed.createComponent(PendingPrintDialogComponent).componentInstance;
    component.confirmed.set(true);
    setPrinted.mockRejectedValue(new Error('Sin conexión'));
    await component.confirmPrinted();
    expect(close).not.toHaveBeenCalled();
    expect(component.error()).toContain('Sin conexión');
    expect(component.busy()).toBe(false);
  });

  it('only administrators can postpone and a reason is mandatory', async () => {
    const component = TestBed.createComponent(PendingPrintDialogComponent).componentInstance;
    await component.postpone();
    expect(postpone).not.toHaveBeenCalled();
    component.reason.set('Sin papel');
    isAdmin.set(false);
    await component.postpone();
    expect(postpone).not.toHaveBeenCalled();
    isAdmin.set(true);
    postpone.mockResolvedValue({ ...note, printPostponedAt: 'today' });
    await component.postpone();
    expect(postpone).toHaveBeenCalledWith(note, 'Sin papel');
    expect(close).toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the error if PDF generation fails', async () => {
    const component = TestBed.createComponent(PendingPrintDialogComponent).componentInstance;
    const popup = { close: vi.fn(), opener: null };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    getPdf.mockRejectedValue(new Error('Error de PDF'));
    await component.openPdf();
    expect(component.error()).toContain('Error de PDF');
    expect(close).not.toHaveBeenCalled();
    expect(setPrinted).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
