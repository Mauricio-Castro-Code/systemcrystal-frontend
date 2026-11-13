import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BackNavigationService } from './back-navigation.service';
import { SessionStateService } from './session-state.service';

@Component({ template: '' })
class NavigationTestPage {}

describe('Contextual back navigation', () => {
  let service: BackNavigationService;
  let harness: RouterTestingHarness;
  let router: Router;
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'blocked', canActivate: [() => false], component: NavigationTestPage }, { path: '**', component: NavigationTestPage }]), provideLocationMocks()] });
    service = TestBed.inject(BackNavigationService);
    router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    harness = await RouterTestingHarness.create('/dashboard');
  });

  it('returns from edit to the note and then to Inicio', async () => {
    await harness.navigateByUrl('/pedidos/1259-26');
    expect(service.label()).toBe('Volver a Inicio');
    await harness.navigateByUrl('/pedidos/1259-26/editar');
    expect(service.label()).toBe('Volver a la nota');
    await service.goBack();
    expect(router.url).toBe('/pedidos/1259-26');
    expect(service.label()).toBe('Volver a Inicio');
    await service.goBack();
    expect(router.url).toBe('/dashboard');
  });

  it('preserves the archive query as origin and tracks browser back and forward', async () => {
    await harness.navigateByUrl('/pedidos/registro?buscar=Ana');
    await harness.navigateByUrl('/pedidos/registro/1259-26');
    await service.goBack();
    expect(router.url).toBe('/pedidos/registro?buscar=Ana');
    const location = TestBed.inject(Location);
    const end = new Promise<void>(resolve => { const sub = router.events.subscribe(() => {
      if (router.url === '/pedidos/registro/1259-26') { sub.unsubscribe(); resolve(); }
    }); });
    location.forward();
    await end;
    expect(service.label()).toBe('Volver a Registro');
  });

  it('returns to the client profile after opening a quotation there', async () => {
    await harness.navigateByUrl('/clientes/CLI-001');
    await harness.navigateByUrl('/cotizaciones/nueva?clienteId=CLI-001');
    expect(service.label()).toBe('Volver al cliente');
    await service.goBack();
    expect(router.url).toBe('/clientes/CLI-001');
  });

  it('removes the editor from the return path after saving a note opened from Inicio', async () => {
    await harness.navigateByUrl('/pedidos/1259-26');
    await harness.navigateByUrl('/pedidos/1259-26/editar');
    await service.returnToRecord('/pedidos/1259-26');
    expect(router.url).toBe('/pedidos/1259-26');
    await service.goBack();
    expect(router.url).toBe('/dashboard');
  });

  it('replaces an editor opened from the list rather than adding an edit/detail loop', async () => {
    await harness.navigateByUrl('/pedidos');
    await harness.navigateByUrl('/pedidos/1259-26/editar');
    await service.returnToRecord('/pedidos/1259-26');
    expect(router.url).toBe('/pedidos/1259-26');
    await service.goBack();
    expect(router.url).toBe('/pedidos');
  });

  it('does not record a cancelled navigation as a previous page', async () => {
    await harness.navigateByUrl('/pedidos/1259-26');
    expect(await router.navigateByUrl('/blocked')).toBe(false);
    expect(service.label()).toBe('Volver a Inicio');
    await service.goBack();
    expect(router.url).toBe('/dashboard');
  });

  it('returns to the archived detail after editing without switching to active notes', async () => {
    await harness.navigateByUrl('/pedidos/registro?buscar=Ana');
    await harness.navigateByUrl('/pedidos/registro/1259-26');
    await harness.navigateByUrl('/pedidos/1259-26/editar');
    await service.returnToRecord('/pedidos/1259-26');
    expect(router.url).toBe('/pedidos/registro/1259-26');
    await service.goBack();
    expect(router.url).toBe('/pedidos/registro?buscar=Ana');
  });

  it.each([
    ['/pedidos/1259-26/editar', '/pedidos/1259-26'],
    ['/pedidos/registro/1259-26', '/pedidos/registro'],
    ['/cotizaciones/001COTI-26/editar', '/cotizaciones/001COTI-26'],
    ['/cotizaciones/001COTI-26', '/cotizaciones/registro'],
    ['/clientes/CLI-001', '/clientes'],
    ['/inventario', '/dashboard'],
  ])('uses a safe fallback from %s without known session history', async (url, expected) => {
    await harness.navigateByUrl(url);
    TestBed.inject(SessionStateService).reset();
    await service.goBack();
    expect(router.url).toBe(expected);
  });

  it('does not navigate to a login page or external site when the session history is reset', async () => {
    await harness.navigateByUrl('/pedidos/1259-26');
    TestBed.inject(SessionStateService).reset();
    expect(service.label()).toBe('Volver a Notas activas');
    await service.goBack();
    expect(router.url).toBe('/pedidos');
    expect(service.showBack()).toBe(true);
    await service.returnToRecord('https://example.com');
    expect(router.url).toBe('/dashboard');
    expect(service.showBack()).toBe(false);
  });
});
