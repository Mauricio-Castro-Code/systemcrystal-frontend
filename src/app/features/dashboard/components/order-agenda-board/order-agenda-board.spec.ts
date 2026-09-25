import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OrderAgendaBoardComponent } from './order-agenda-board';
import { DashboardOrderGroup } from '../../models/dashboard-order-group.model';

@Component({ template: '' })
class NoteDetailStub {}

describe('OrderAgendaBoardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderAgendaBoardComponent],
      providers: [provideRouter([{ path: 'pedidos/:orderId', component: NoteDetailStub }])],
    }).compileComponents();
  });

  for (const groupId of ['today', 'tomorrow', 'weekend', 'delivery-range'] as const) {
    it(`opens the selected note from ${groupId}`, async () => {
      const fixture = TestBed.createComponent(OrderAgendaBoardComponent);
      const group: DashboardOrderGroup = {
        id: groupId,
        title: 'Notas',
        subtitle: 'Entregas',
        emptyMessage: 'Sin notas',
        orders: [{ id: '125-2026', clientName: 'Cliente de prueba', address: 'Centro', total: 1500 }],
      };
      fixture.componentRef.setInput('groups', [group]);
      await fixture.whenStable();
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
      expect(link.getAttribute('href')).toBe('/pedidos/125-2026');
      expect(link.getAttribute('aria-label')).toContain('125-2026');
      link.click();
      await fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/pedidos/125-2026');
    });
  }
  it('paginates twenty notes independently and resets when the results change', async () => {
    const fixture = TestBed.createComponent(OrderAgendaBoardComponent);
    const orders = Array.from({ length: 20 }, (_, i) => ({
      id: `${i + 1}-2026`, clientName: `Cliente ${i + 1}`, address: 'Centro', total: 100,
    }));
    const today: DashboardOrderGroup = { id: 'today', title: 'Hoy', subtitle: '', emptyMessage: '', orders };
    const tomorrow: DashboardOrderGroup = { ...today, id: 'tomorrow', title: 'Mañana' };
    fixture.componentRef.setInput('groups', [today, tomorrow]);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(10);
    expect(page.pageCount(today)).toBe(4);
    const next: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Página siguiente de Hoy"]');
    next.click();
    await fixture.whenStable();
    expect(page.visibleOrders(today)[0].id).toBe('6-2026');
    expect(page.pageIndex(tomorrow)).toBe(0);
    page.changePage(today, 1);
    page.changePage(today, 1);
    await fixture.whenStable();
    expect(page.firstVisible(today)).toBe(16);
    expect(page.lastVisible(today)).toBe(20);
    expect(next.disabled).toBe(true);
    fixture.componentRef.setInput('groups', [{ ...today, orders: orders.slice(0, 2) }]);
    await fixture.whenStable();
    expect(page.pageIndex(today)).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.order-agenda-board__page-controls').length).toBe(0);
  });

});
