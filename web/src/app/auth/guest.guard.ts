import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Allows only non-authenticated users. If already logged in, redirect to /app.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ready$.pipe(
    map(() => (auth.isLoggedIn() ? router.parseUrl('/app') : true)),
  );
};
