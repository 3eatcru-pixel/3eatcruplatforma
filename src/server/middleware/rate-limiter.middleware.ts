import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
  firstRequestTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  code?: string;
  skipFailedRequests?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Muitas requisições originadas deste endereço. Limite temporariamente excedido.',
    code = 'RATE_LIMIT_EXCEEDED'
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Periodic cleanup every 60 seconds to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.firstRequestTime > windowMs * 2) {
        hits.delete(key);
      }
    }
  }, 60_000);

  // Avoid keeping node event loop open solely for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim() || req.ip || 'unknown'
      : (Array.isArray(forwarded) ? forwarded[0] : req.ip) || 'unknown';

    // Disambiguate authenticated requests by user id or tenant
    const userId = req.user?.id ? `user:${req.user.id}` : '';
    const key = `${clientIp}${userId ? `:${userId}` : ''}`;

    const now = Date.now();
    let record = hits.get(key);

    if (!record) {
      record = { timestamps: [], firstRequestTime: now };
      hits.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    const windowStart = now - windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const currentCount = record.timestamps.length;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const resetTime = Math.ceil((windowStart + windowMs - now) / 1000);

    res.setHeader('RateLimit-Limit', maxRequests.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Reset', Math.max(1, resetTime).toString());

    if (currentCount >= maxRequests) {
      res.setHeader('Retry-After', Math.max(1, resetTime).toString());
      res.status(429).json({
        error: message,
        code,
        retryAfterSeconds: Math.max(1, resetTime)
      });
      return;
    }

    record.timestamps.push(now);
    record.firstRequestTime = Math.min(record.firstRequestTime, now);

    next();
  };
}

// Preset Rate Limiters for Business Protection
export const publicOrderRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  message: 'Limite de criação de pedidos excedido para este IP/usuário. Aguarde 1 minuto.',
  code: 'ORDER_RATE_LIMIT_EXCEEDED'
});

export const paymentProcessRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 25,
  message: 'Muitas tentativas de processamento de pagamento. Aguarde 1 minuto.',
  code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
});

export const publicReservationRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 15,
  message: 'Limite de agendamentos/reservas excedido. Aguarde 1 minuto.',
  code: 'RESERVATION_RATE_LIMIT_EXCEEDED'
});

export const authRegisterRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Muitas tentativas de cadastro comercial. Aguarde 1 minuto.',
  code: 'REGISTER_RATE_LIMIT_EXCEEDED'
});

export const apiGeneralRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 150,
  message: 'Taxa de requisições à API excedida.',
  code: 'API_RATE_LIMIT_EXCEEDED'
});
