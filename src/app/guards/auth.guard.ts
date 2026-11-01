import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SecurityService } from '../services/security.service';
import { UiNotificationService } from '../services/ui-notification.service';

/**
 * Functional Guard for HQ Central
 * Relies on verified Firebase Custom Claims (`role === 'hq_admin'`) synchronized with `/api/auth/me`.
 * Wildcard email domain checks (`@3eatcru.com`) are strictly forbidden.
 */
export const hqAdminGuard: CanActivateFn = () => {
  const security = inject(SecurityService);
  const notifications = inject(UiNotificationService);
  const router = inject(Router);

  security.setPillar('hq');

  return security.waitForAuth().then((session) => {
    if (session && session.role === 'hq_admin') {
      return true;
    }

    notifications.notify(
      'Acesso restrito: O HQ Central é exclusivo para o Administrador da Plataforma (perfil hq_admin).',
      'warning'
    );
    router.navigate(['/hq/login']);
    return false;
  });
};

/**
 * Functional Guard for Store OS
 * Allows Tenant Owners, Store Operators, Waiters, and HQ Admins.
 */
export const storeOperatorGuard: CanActivateFn = () => {
  const security = inject(SecurityService);
  const notifications = inject(UiNotificationService);
  const router = inject(Router);

  security.setPillar('os');

  return security.waitForAuth().then(() => {
    if (security.isStoreStaff()) {
      return true;
    }

    notifications.notify(
      'Acesso negado: Autentique-se como Proprietário, Operador ou Garçom para acessar o Store OS.',
      'warning'
    );
    router.navigate(['/os/login']);
    return false;
  });
};
