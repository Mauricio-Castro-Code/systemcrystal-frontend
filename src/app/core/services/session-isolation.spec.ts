import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { OrderRecordsService } from './order-records.service';
import { authErrorInterceptor } from '../interceptors/auth-error.interceptor';
import { authGuard } from '../guards/auth.guard';
import { API_BASE_URL } from '../config/api.config';

describe('Session data isolation', () => {
  let auth: AuthService;
  let records: OrderRecordsService;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authErrorInterceptor])), provideHttpClientTesting(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
    records = TestBed.inject(OrderRecordsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  async function login(role: 'ventas' | 'chofer') {
    const promise = auth.signIn({ identifier: role, password: 'test' });
    http.expectOne(`${API_BASE_URL}/auth/login/`).flush({ id: role, displayName: role, email: `${role}@example.test`, token: `test-${role}`, role, isAdmin: false });
    await promise;
  }
  async function loadNote() {
    const load = records.loadOrderById('1-26', true);
    http.expectOne(`${API_BASE_URL}/orders/1-26/`).flush({ orderId: '1-26', clientName: 'Previous user', totalEstimated: 9900 });
    await load;
  }

  it('clears cached notes immediately on logout', async () => {
    await login('ventas');
    await loadNote();
    const logout = auth.signOut();
    expect(records.getOrderById('1-26')).toBeUndefined();
    http.expectOne(`${API_BASE_URL}/auth/logout/`).flush({});
    await logout;
  });

  it('discards a previous sessions successful response', async () => {
    await login('ventas');
    const load = records.loadOrderById('1-26', true).catch(() => null);
    const pending = http.expectOne(`${API_BASE_URL}/orders/1-26/`);
    await login('chofer');
    pending.flush({ orderId: '1-26', clientName: 'Previous user', totalEstimated: 9900 });
    await load;
    expect(records.getOrderById('1-26')).toBeUndefined();
    expect(auth.role()).toBe('chofer');
  });

  it('does not sign out the new user for an old requests 401', async () => {
    await login('ventas');
    const load = records.loadOrderById('1-26', true).catch(() => null);
    const pending = http.expectOne(`${API_BASE_URL}/orders/1-26/`);
    await login('chofer');
    pending.flush({}, { status: 401, statusText: 'Unauthorized' });
    await load;
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.role()).toBe('chofer');
  });

  it('clears previously cached records when access is revoked', async () => {
    await login('ventas');
    await loadNote();
    const denied = records.loadOrderById('1-26', true).catch(() => null);
    http.expectOne(`${API_BASE_URL}/orders/1-26/`).flush({}, { status: 403, statusText: 'Forbidden' });
    await denied;
    expect(records.getOrderById('1-26')).toBeUndefined();
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('redirects drivers away from office routes', async () => {
    await login('chofer');
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(String(result)).toBe('/mi-ruta');
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/mi-ruta');
  });
});
