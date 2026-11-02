import { Router } from 'express';
import { healthRouter } from './routes/health.router';
import { authRouter } from './routes/auth.router';
import { hqRouter } from './routes/hq.router';
import { tenantsRouter } from './routes/tenants.router';
import { productsRouter } from './routes/products.router';
import { ordersRouter } from './routes/orders.router';
import { tablesRouter } from './routes/tables.router';
import { financialsRouter } from './routes/financials.router';
import { logisticsRouter } from './routes/logistics.router';
import { paymentsRouter } from './routes/payments.router';
import { crmRouter } from './routes/crm.router';
import { reservationsRouter } from './routes/reservations.router';
import { notesRouter } from './routes/notes.router';
import { hrRouter } from './routes/hr.router';
import { serviceOrdersRouter } from './routes/service-orders.router';
import { suppliersRouter } from './routes/suppliers.router';
import { stockAuditsRouter } from './routes/stock-audits.router';
import { tasksRouter } from './routes/tasks.router';
import { billingRouter } from './routes/billing.router';
import { marketplaceDeliveryRouter } from './routes/marketplace-delivery.router';
import { authContext } from './middleware/auth.middleware';
import { apiGeneralRateLimiter } from './middleware/rate-limiter.middleware';

export const apiRouter = Router();

// Universal baseline rate limiting across all API endpoints
apiRouter.use(apiGeneralRateLimiter);

// Universal Firebase ID Token + Custom Claims extraction middleware
apiRouter.use(authContext);

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/hq', hqRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/marketplace-delivery', marketplaceDeliveryRouter);
apiRouter.use('/tenants', tenantsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/tables', tablesRouter);
apiRouter.use('/financials', financialsRouter);
apiRouter.use('/logistics', logisticsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/crm', crmRouter);
apiRouter.use('/notes', notesRouter);
apiRouter.use('/hr', hrRouter);
apiRouter.use('/service-orders', serviceOrdersRouter);
apiRouter.use('/suppliers', suppliersRouter);
apiRouter.use('/stock-audits', stockAuditsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/reservations', reservationsRouter);
apiRouter.use('/appointments', reservationsRouter);

// Fallback 404 for undefined API routes
apiRouter.use((_req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    documentation: '/api/health for system status'
  });
});
