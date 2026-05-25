import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { ITokenService, TokenPair, AccessTokenPayload } from '../../../domain/ports/TokenService';

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      }),
      this.jwtService.signAsync(
        { sub: payload.sub },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
  }

  async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    return this.jwtService.verifyAsync<{ sub: string }>(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }

  async hashRefreshToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
