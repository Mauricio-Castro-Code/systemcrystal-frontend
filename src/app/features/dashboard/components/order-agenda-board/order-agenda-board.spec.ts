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
});
