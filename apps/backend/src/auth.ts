import { ProfileDto, PasswordDto } from './profile.dto';
import {
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UnsupportedMediaTypeException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { Database } from './database';
import { verifyPassword, hashPassword } from './password';
import {
  ADMIN_EMAIL,
  ADMIN_DISPLAY_NAME,
  SESSION_COOKIE,
  SESSION_COOKIE_AGE_MS,
} from './auth.constants';
import type { User } from './generated/prisma/client';

export type AuthRequest = Request & {
  userId: string;
  sessionId: string;
  csrfToken: string;
};
export const publicUser = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;
const privateUser = (user: User) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
});
class LoginDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @MinLength(1) password!: string;
}
class SetupDto {
  @ApiProperty() @IsString() @MinLength(6) password!: string;
}
function constantEqual(first: string, second: string) {
  // Hash first so secrets of different lengths still use a constant-time compare.
  return timingSafeEqual(
    createHash('sha256').update(first).digest(),
    createHash('sha256').update(second).digest(),
  );
}
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
function sessionCookie(req: Request) {
  const values = (req.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (values.length !== 1) return undefined;
  try {
    return decodeURIComponent(values[0]!.slice(SESSION_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}
// Keep login/setup outside the browser's simple HTML-form request types. This
// prevents form-based login CSRF without an origin allowlist or proxy scheme.
@Injectable()
class JsonRequestGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.is('application/json'))
      throw new UnsupportedMediaTypeException(
        'Content-Type must be application/json',
      );
    return true;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: Database,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    const authorization = req.headers.authorization;
    const bearer = /^Bearer (\S+)$/.exec(authorization ?? '');
    // A supplied invalid Authorization header cannot silently use a cookie.
    const token = authorization ? bearer?.[1] : sessionCookie(req);
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        sid: string;
        version: number;
      }>(token, {
        algorithms: ['HS256'],
        issuer: 'cool',
        audience: 'cool-admin',
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        !Number.isInteger(payload.version)
      )
        throw new Error();
      const session = await this.db.adminSession.findUnique({
        where: { id: payload.sid },
        include: { user: true },
      });
      if (
        !session ||
        session.revokedAt ||
        session.userId !== payload.sub ||
        session.user.email !== ADMIN_EMAIL ||
        !session.user.passwordHash ||
        session.user.authVersion !== payload.version
      )
        throw new Error();
      req.userId = payload.sub;
      req.sessionId = session.id;
      req.csrfToken = session.csrfToken;
    } catch {
      throw new UnauthorizedException();
    }
    if (!authorization && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!constantEqual(req.get('x-csrf-token') ?? '', req.csrfToken))
        throw new ForbiddenException('A valid X-CSRF-Token is required');
    }
    return true;
  }
}
@ApiTags('Authentication')
@Controller('admin/auth')
export class AuthController {
  private readonly dummyHash = hashPassword('constant-time-missing-account');
  constructor(
    private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}
  private async issueSession(user: User, res: Response) {
    const session = await this.db.adminSession.create({
      data: { userId: user.id, csrfToken: randomBytes(32).toString('hex') },
    });
    // JWT and cookie expire after 15 days; DB revocation can end a session earlier.
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      sid: session.id,
      version: user.authVersion,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.cookie(SESSION_COOKIE, accessToken, {
      ...cookieOptions(),
      maxAge: SESSION_COOKIE_AGE_MS,
    });
    return {
      user: privateUser(user),
      csrfToken: session.csrfToken,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: SESSION_COOKIE_AGE_MS / 1000,
    };
  }
  @Get('status')
  async status(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const user = await this.db.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    const initialized = !!user?.passwordHash;
    return {
      email: ADMIN_EMAIL,
      initialized,
      setupAvailable: !initialized,
    };
  }
  @Post('setup')
  @UseGuards(JsonRequestGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async setup(
    @Body() body: SetupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const passwordHash = await hashPassword(body.password);
    const user = await this.db.$transaction(async (tx) => {
      // Seed and concurrent first requests serialize on the same transaction lock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(732019)`;
      const owner = await tx.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {},
        create: {
          email: ADMIN_EMAIL,
          passwordHash: null,
          displayName: ADMIN_DISPLAY_NAME,
        },
      });
      if (owner.passwordHash)
        throw new ConflictException('Administrator is already initialized');
      const changed = await tx.user.updateMany({
        where: { id: owner.id, passwordHash: null },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          ...(owner.displayName === 'Administrator'
            ? { displayName: ADMIN_DISPLAY_NAME }
            : {}),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Administrator is already initialized');
      return tx.user.findUniqueOrThrow({ where: { id: owner.id } });
    });
    return this.issueSession(user, res);
  }
  @Post('login')
  @UseGuards(JsonRequestGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user =
      body.email.trim().toLowerCase() === ADMIN_EMAIL
        ? await this.db.user.findUnique({ where: { email: ADMIN_EMAIL } })
        : null;
    const valid = await verifyPassword(
      body.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user?.passwordHash || !valid)
      throw new UnauthorizedException('Invalid email or password');
    return this.issueSession(user, res);
  }
  @Get('session')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  async session(@Req() req: AuthRequest) {
    return { user: await this.me(req), csrfToken: req.csrfToken };
  }
  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) {
    return this.db.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { ...publicUser, email: true },
    });
  }
  @Post('logout')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.db.adminSession.update({
      where: { id: req.sessionId },
      data: { revokedAt: new Date() },
    });
    clearSession(res);
    return { message: 'Signed out.' };
  }
  @Post('revoke-all')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  async revokeAll(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.db.$transaction([
      this.db.user.update({
        where: { id: req.userId },
        data: { authVersion: { increment: 1 } },
      }),
      this.db.adminSession.updateMany({
        where: { userId: req.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    clearSession(res);
    return { message: 'All sessions revoked. Sign in again.' };
  }
  @Put('profile')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  profile(@Req() req: AuthRequest, @Body() data: ProfileDto) {
    return this.db.user.update({
      where: { id: req.userId },
      data,
      select: { ...publicUser, email: true },
    });
  }
  @Put('password')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  async password(
    @Req() req: AuthRequest,
    @Body() data: PasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const owner = await this.db.user.findUniqueOrThrow({
      where: { id: req.userId },
    });
    if (
      !owner.passwordHash ||
      !(await verifyPassword(data.currentPassword, owner.passwordHash))
    )
      throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await hashPassword(data.newPassword);
    await this.db.$transaction([
      this.db.user.update({
        where: { id: owner.id },
        data: { passwordHash, authVersion: { increment: 1 } },
      }),
      this.db.adminSession.updateMany({
        where: { userId: owner.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    clearSession(res);
    return { message: 'Password changed. Sign in again.' };
  }
}
