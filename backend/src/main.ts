import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes prefixed with /api
  app.setGlobalPrefix('api');

  // Allow requests from the Next.js frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe — strips unknown fields, transforms types.
  // whitelist:true silently removes any property not declared in the DTO.
  // forbidNonWhitelisted is intentionally OFF — the frontend sends the full
  // entity object (including computed fields like id, faceDescriptor, etc.)
  // and we want those stripped, not rejected.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 HRMS Backend running on http://localhost:${port}/api`);
}

bootstrap();
