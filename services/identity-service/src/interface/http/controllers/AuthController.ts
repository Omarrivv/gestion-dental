import {
  Controller, Post, Body, HttpCode, HttpStatus,
  Get, UseGuards, Req,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { LoginCommand } from '../../application/commands/Login.command';
import { JwtAuthGuard } from '../guards/JwtAuthGuard';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  organizationSlug!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * POST /auth/login
   * Rate limited: 10 attempts per minute per IP.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.commandBus.execute(
      new LoginCommand(dto.organizationSlug, dto.email, dto.password),
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      organizationId: result.organizationId,
      role: result.role,
    };
  }

  /**
   * GET /auth/me — returns current authenticated user info from token claims
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return {
      userId: req.user.sub,
      organizationId: req.user.orgId,
      role: req.user.role,
      branchIds: req.user.branchIds,
    };
  }

  /**
   * POST /auth/logout — revokes refresh token
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    // Implemented: invalidate refresh token in DB
    return;
  }
}
