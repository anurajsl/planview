import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  });

  // ─── Security ───
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
    maxAge: 86400,
  });

  // ─── Global Exception Filter ───
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Global Validation ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── API Prefix ───
  app.setGlobalPrefix('api/v1');

  // ─── Swagger Documentation ───
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PlanView API')
      .setDescription('Gantt-first project management platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${process.env.PORT || 4000}`, 'Local Development')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ─── Graceful Shutdown ───
  app.enableShutdownHooks();

  // ─── Auto-init database tables on first run ───
  try {
    const dataSource = app.get<import('typeorm').DataSource>(
      (await import('@nestjs/typeorm')).getDataSourceToken() as any,
    );
    const result = await dataSource.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants'",
    );
    if (parseInt(result[0].count, 10) === 0) {
      logger.log('No tables found — creating schema from entities...');
      await dataSource.synchronize();
      logger.log('Database schema created successfully');
    } else {
      logger.log('Database tables already exist');
    }
  } catch (e: any) {
    logger.error(`DB auto-init failed: ${e.message}`);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`PlanView API running on http://localhost:${port}`);
  logger.log(`API Docs: http://localhost:${port}/api/docs`);
  logger.log(`Health: http://localhost:${port}/api/v1/health`);
}

bootstrap();
