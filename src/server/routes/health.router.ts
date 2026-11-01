import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    system: '3EATCRU Gastronomic Ecosystem API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memory: {
      rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2))
    },
    environment: process.env['NODE_ENV'] || 'development'
  });
});
