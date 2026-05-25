import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const port = parseInt(process.env.IDENTITY_SERVICE_PORT ?? '3001', 10);
  const logger = new Logger('IdentityService');

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  await app.listen(port, '0.0.0.0');
  logger.log(`Identity service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
