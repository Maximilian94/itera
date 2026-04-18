import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // Triggers onApplicationShutdown hooks (e.g. AnalyticsService flushes
  // pending PostHog events before the process exits).
  app.enableShutdownHooks();
  app.use(
    json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://www.maximizeenfermagem.com.br',
      'https://maximizeenfermagem.com.br',
      'https://app.maximizeenfermagem.com.br',
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().then(() => {});
