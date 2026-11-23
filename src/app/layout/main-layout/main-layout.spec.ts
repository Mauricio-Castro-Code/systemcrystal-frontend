import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { PrintQueueService } from '../../core/services/print-queue.service';
import { AuthService } from '../../core/services/auth.service';
import { BackNavigationService } from '../../core/services/back-navigation.service';
import { MainLayoutComponent } from './main-layout';

@Component({ template: '<p>Contenido de prueba</p>' })
class ContentPage {}

describe('Shared back bar', () => {
  it('shows the actual origin in detail and editing and hides on Inicio', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: MainLayoutComponent,
            children: [{ path: '**', component: ContentPage }],
          },
        ]),
        provideLocationMocks(),
        {
          provide: PrintQueueService,
          useValue: { pending: signal([]), error: signal(''), refresh: async () => {} },
        },
        { provide: AuthService, useValue: { userSession: signal(null), isAdmin: signal(true) } },
      ],
    });
    TestBed.inject(BackNavigationService);
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create('/dashboard');
    expect(harness.routeNativeElement!.querySelector('.main-layout__backbar')).toBeNull();
    await harness.navigateByUrl('/pedidos/1259-26');
    expect(harness.routeNativeElement!.querySelector('.main-layout__back')!.textContent).toContain(
      'Volver a Inicio',
    );
    await harness.navigateByUrl('/pedidos/1259-26/editar');
    const back =
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.main-layout__back')!;
    expect(back.textContent).toContain('Volver a la nota');
    const returned = firstValueFrom(
      router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      ),
    );
    back.click();
    await returned;
    await harness.fixture.whenStable();
    expect(router.url).toBe('/pedidos/1259-26');
  });
});
