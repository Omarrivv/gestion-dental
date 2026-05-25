import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/UserRepository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/PasswordHasher';
import { ITokenService, TOKEN_SERVICE, TokenPair } from '../../domain/ports/TokenService';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export class LoginCommand {
  constructor(
    public readonly organizationSlug: string,
    public readonly email: string,
    public readonly password: string,
  ) {}
}

export interface LoginResult extends TokenPair {
  userId: string;
  organizationId: string;
  role: string;
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, LoginResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(cmd: LoginCommand): Promise<LoginResult> {
    // Resolve org by slug
    const org = await this.prisma.organization.findUnique({
      where: { slug: cmd.organizationSlug },
      select: { id: true, status: true },
    });

    if (!org) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (org.status !== 'ACTIVE') {
      throw new UnauthorizedException('Organization is not active');
    }

    const user = await this.userRepo.findByEmail(org.id, cmd.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.passwordHasher.compare(cmd.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenPair = await this.tokenService.generateTokenPair({
      sub: user.id,
      orgId: user.organizationId,
      role: user.roleValue,
      branchIds: user.branchIds,
    });

    // Store hashed refresh token
    const tokenHash = await this.tokenService.hashRefreshToken(tokenPair.refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7d
      },
    });

    user.recordLogin();
    await this.userRepo.save(user);

    return {
      ...tokenPair,
      userId: user.id,
      organizationId: user.organizationId,
      role: user.roleValue,
    };
  }
}
