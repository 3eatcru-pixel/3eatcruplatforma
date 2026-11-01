import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import {apiRouter} from './server/api';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

// Secure reverse-proxy configuration: trust only immediate front-end proxy (Google Cloud Run / Nginx)
app.set('trust proxy', 1);

// Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Bounded JSON and URL-encoded payload limits to prevent resource exhaustion attacks
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: true,
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Business API routes (Express unified backend)
 */
app.use('/api', apiRouter);

/**
 * Root Redirect: Canonical entry point immediately directed to Consumer Portal (/home)
 */
app.get('/', (_req, res) => {
  res.redirect(302, '/home');
});

/**
 * Marketplace Alias Redirect: Support legacy links
 */
app.get('/marketplace', (_req, res) => {
  res.redirect(301, '/home');
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Centralized Error Handling Middleware
 */
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({
    error: 'Erro interno no servidor.',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
