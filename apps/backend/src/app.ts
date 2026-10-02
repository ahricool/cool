import { LibraryController, PublicLibraryController } from './library';
import { SettingsController } from './settings';
import { PublicCommentsController, AdminCommentsController } from './comments';
import { MediaController, PublicMediaController } from './media';
import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { readConfig } from './config';
import { Database } from './database';
import { AuthController, AuthGuard } from './auth';
import { AdminPostsController, PostsService } from './posts';
import { PublicController } from './public';
import { DatabaseErrorFilter } from './errors';
@Controller('health')
class HealthController {
  constructor(private readonly db: Database) {}
  @Get() async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: readConfig().jwtSecret,
        signOptions: {
          algorithm: 'HS256',
          expiresIn: '15d',
          issuer: 'cool',
          audience: 'cool-admin',
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
  ],
  controllers: [
    LibraryController,
    PublicLibraryController,
    SettingsController,
    PublicCommentsController,
    AdminCommentsController,
    MediaController,
    PublicMediaController,
    HealthController,
    AuthController,
    AdminPostsController,
    PublicController,
  ],
  providers: [
    Database,
    AuthGuard,
    PostsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
export async function createApp() {
  readConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // Production is private behind the built-in Nginx, which replaces forwarding
  // headers. Trust that one adjacent hop, regardless of external proxy layers.
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  // Public/API clients can use any origin. Never reflect credentialed origins;
  // the browser admin uses same-origin cookies and a per-session CSRF token.
  app.enableCors({ origin: '*', credentials: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DatabaseErrorFilter());
  app.enableShutdownHooks();
  // Production exposes the JSON contract but keeps the interactive UI off.
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Cool API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('cool_session')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    ui: process.env.NODE_ENV !== 'production',
    jsonDocumentUrl: 'api/openapi.json',
  });
  return app;
}
