import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsArray, MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../guards/JwtAuthGuard';
import { RolesGuard } from '../guards/RolesGuard';
import { Roles } from '../decorators/Roles.decorator';
import { CurrentUser } from '../decorators/CurrentUser.decorator';
import { UserRole } from '../../../domain/value-objects/Role';
import { CreateUserCommand } from '../../../application/commands/CreateUser.command';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @IsOptional()
  branchIds?: string[];
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.commandBus.execute(
      new CreateUserCommand(
        user.orgId,
        dto.email,
        dto.password,
        dto.firstName,
        dto.lastName,
        dto.role,
        dto.branchIds ?? [],
        dto.phone,
      ),
    );
    return result;
  }

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  async listUsers(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: user.orgId },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, role: true, isActive: true,
        branchAccess: { select: { branchId: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });
    return { items: users };
  }
}
