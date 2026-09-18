import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let auth: AuthService;
  const navigateByUrl = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    localStorage.clear();
    navigateByUrl.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    requests.verify();
    localStorage.clear();
  });

  async function signIn() {
    const promise = auth.signIn({ identifier: 'admin', password: 'test-password' });
    requests.expectOne(`${API_BASE_URL}/auth/login/`).flush({ token: 'expired', isAdmin: true });
    await promise;
  }

  it('clears an expired session without sending another logout request', async () => {
    await signIn();
    http.get(`${API_BASE_URL}/orders/`).subscribe({ error: () => {} });
    requests.expectOne(`${API_BASE_URL}/orders/`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('orderflow.session')).toBeNull();
    requests.expectNone(`${API_BASE_URL}/auth/logout/`);
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not retry logout when the token is already invalid', async () => {
    await signIn();
    const logout = auth.signOut();
    expect(auth.isAuthenticated()).toBe(false);
    requests.expectOne(`${API_BASE_URL}/auth/logout/`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await logout;
    requests.expectNone(`${API_BASE_URL}/auth/logout/`);
  });

  it('does not clear the session for an unrelated server', async () => {
    await signIn();
    http.get('https://example.com/data').subscribe({ error: () => {} });
    requests.expectOne('https://example.com/data').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
