export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;        // userId
  orgId: string;      // organizationId
  role: string;
  branchIds: string[];
}

export interface ITokenService {
  generateTokenPair(payload: AccessTokenPayload): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  verifyRefreshToken(token: string): Promise<{ sub: string }>;
  hashRefreshToken(token: string): Promise<string>;
}
