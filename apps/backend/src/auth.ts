import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { Database } from './database';
import { verifyPassword, hashPassword } from './password';
export type AuthRequest = Request & { userId: string };
export const publicUser = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;
class LoginDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(256) password!: string;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: Database,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(match[1]!, {
        algorithms: ['HS256'],
        issuer: 'cms',
        audience: 'cms-admin',
      });
      if (
        typeof payload.sub !== 'string' ||
        !(await this.db.user.findUnique({
          where: { id: payload.sub },
          select: { id: true },
        }))
      )
        throw new Error();
      req.userId = payload.sub;
    } catch {
      throw new UnauthorizedException();
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
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() body: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    const valid = await verifyPassword(
      body.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid)
      throw new UnauthorizedException('Invalid email or password');
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) {
    return this.db.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { ...publicUser, email: true },
    });
  }
}
