import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

// Persistence
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { PrismaOrganizationRepository } from './infrastructure/persistence/prisma/PrismaOrganizationRepository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma/PrismaUserRepository';

// Auth infrastructure
import { JwtTokenService } from './infrastructure/auth/JwtTokenService';
import { BcryptPasswordHasher } from './infrastructure/auth/BcryptPasswordHasher';

// Messaging
import { RabbitMQEventPublisher } from './infrastructure/messaging/RabbitMQEventPublisher';

// Commands
import { CreateOrganizationHandler } from './application/commands/CreateOrganization.command';
import { CreateUserHandler } from './application/commands/CreateUser.command';
import { CreateBranchHandler } from './application/commands/CreateBranch.command';
import { LoginHandler } from './application/commands/Login.command';

// Controllers
import { AuthController } from './interface/http/controllers/AuthController';
import { OrganizationsController } from './interface/http/controllers/OrganizationsController';
import { UsersController } from './interface/http/controllers/UsersController';

// Ports
import { ORGANIZATION_REPOSITORY } from './domain/ports/OrganizationRepository';
import { USER_REPOSITORY } from './domain/ports/UserRepository';
import { BRANCH_REPOSITORY } from './domain/ports/BranchRepository';
import { TOKEN_SERVICE } from './domain/ports/TokenService';
import { PASSWORD_HASHER } from './domain/ports/PasswordHasher';

const CommandHandlers = [
  CreateOrganizationHandler,
  CreateUserHandler,
  CreateBranchHandler,
  LoginHandler,
];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    JwtModule.register({}), // secrets loaded per-call from env
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [
    AuthController,
    OrganizationsController,
    UsersController,
  ],
  providers: [
    // Infrastructure
    PrismaService,

    // Repository adapters (port → adapter binding)
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: BRANCH_REPOSITORY, useClass: PrismaOrganizationRepository }, // stub; real impl follows same pattern

    // Service adapters
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: 'EVENT_PUBLISHER', useClass: RabbitMQEventPublisher },

    // CQRS handlers
    ...CommandHandlers,

    // Global throttle guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
