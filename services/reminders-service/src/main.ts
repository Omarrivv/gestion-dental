import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  const port = process.env.PORT ?? 3005;
  await app.listen(port, '0.0.0.0');
  console.log(`Reminders service listening on port ${port}`);
}
bootstrap();
