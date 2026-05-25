import 'reflect-metadata';
import Fastify from 'fastify';
import fastifyHttpProxy from '@fastify/http-proxy';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';

const app = Fastify({ logger: true });

const SERVICES: Record<string, string> = {
  '/api/v1/auth':          process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001',
  '/api/v1/organizations': process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001',
  '/api/v1/users':         process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001',
  '/api/v1/branches':      process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001',
  '/api/v1/appointments':  process.env.SCHEDULING_SERVICE_URL ?? 'http://localhost:3002',
  '/api/v1/patients':      process.env.CLINICAL_SERVICE_URL ?? 'http://localhost:3003',
  '/api/v1/invoices':      process.env.PAYMENTS_SERVICE_URL ?? 'http://localhost:3004',
  '/api/v1/reminders':     process.env.REMINDERS_SERVICE_URL ?? 'http://localhost:3005',
  '/api/v1/reports':       process.env.REPORTING_SERVICE_URL ?? 'http://localhost:3006',
};

// ── Public routes (no JWT required) ──────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/organizations',   // POST — create tenant (superadmin out-of-band)
  '/api/v1/health',
];

async function bootstrap() {
  // CORS
  await app.register(fastifyCors, {
    origin: (process.env.CORS_ORIGINS ?? '').split(','),
    credentials: true,
  });

  // Rate limiting — global defaults
  await app.register(fastifyRateLimit, {
    max: 300,
    timeWindow: '1 minute',
  });

  // JWT verification plugin (shared secret for internal verification)
  await app.register(fastifyJwt, {
    secret: process.env.JWT_ACCESS_SECRET!,
  });

  // JWT guard hook — runs before every request
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url;
    const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
    if (isPublic) return;

    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  // Health check
  app.get('/api/v1/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register proxy routes
  for (const [prefix, upstream] of Object.entries(SERVICES)) {
    await app.register(fastifyHttpProxy, {
      upstream,
      prefix,
      rewritePrefix: prefix,
      http2: false,
    });
  }

  const port = parseInt(process.env.API_GATEWAY_PORT ?? '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`API Gateway listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
