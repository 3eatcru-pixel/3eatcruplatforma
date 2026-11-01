import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SecurityService } from '../services/security.service';

/**
 * Client Auth Interceptor
 * Injects real Firebase ID tokens into all outbound requests directed to /api/*.
 * SEC-01: Backend strictly validates the ID token to derive identity and roles.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept relative or backend API calls
  if (req.url.startsWith('/api') || req.url.startsWith('api')) {
    const security = inject(SecurityService);
    const token = security.token();

    let headers = req.headers;

    // SEC-01: Strictly use Authorization header for real identity verification
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const pillar = security.currentPillar();
    if (pillar) {
      headers = headers.set('X-3eatcru-Pillar', pillar);
    }

    // Note: We no longer send x-user-role or x-user-email headers as they are spoofable.
    // The backend extracts these from the verified Firebase ID token.

    const cloned = req.clone({ headers });
    return next(cloned);
  }

  return next(req);
};
