import {
  Controller, Post, Get, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../guards/JwtAuthGuard';
import { RolesGuard } from '../guards/RolesGuard';
import { Roles } from '../decorators/Roles.decorator';
import { UserRole } from '../../../domain/value-objects/Role';
import { CreateOrganizationCommand } from '../../../application/commands/CreateOrganization.command';
import { SubscriptionPlan } from '../../../domain/entities/Organization';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';

class CreateOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  slug!: string;

  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @IsEmail()
  ownerEmail!: string;

  @IsNotEmpty()
  @MinLength(8)
  ownerPassword!: string;

  @IsNotEmpty()
  ownerFirstName!: string;

  @IsNotEmpty()
  ownerLastName!: string;

  @IsOptional()
  @IsString()
  ownerPhone?: string;
}

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * SuperAdmin-only: create a new tenant organization
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.commandBus.execute(
      new CreateOrganizationCommand(
        dto.name,
        dto.slug,
        dto.plan ?? SubscriptionPlan.STARTER,
        dto.ownerEmail,
        dto.ownerPassword,
        dto.ownerFirstName,
        dto.ownerLastName,
        dto.ownerPhone,
      ),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrganization(@Param('id') id: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, name: true, slug: true, plan: true,
        status: true, logoUrl: true, primaryColor: true,
        branches: {
          select: { id: true, name: true, city: true, isActive: true },
        },
      },
    });
  }
}
