import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, ConflictException } from '@nestjs/common';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Organization, SubscriptionPlan } from '../../domain/entities/Organization';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../domain/ports/OrganizationRepository';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/UserRepository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/PasswordHasher';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/value-objects/Role';
import { IEventPublisher } from '@dental/shared-kernel';

export class CreateOrganizationCommand {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly plan: SubscriptionPlan,
    public readonly ownerEmail: string,
    public readonly ownerPassword: string,
    public readonly ownerFirstName: string,
    public readonly ownerLastName: string,
    public readonly ownerPhone?: string,
  ) {}
}

export interface CreateOrganizationResult {
  organizationId: string;
  userId: string;
}

@CommandHandler(CreateOrganizationCommand)
export class CreateOrganizationHandler implements ICommandHandler<CreateOrganizationCommand, CreateOrganizationResult> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject('EVENT_PUBLISHER') private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(cmd: CreateOrganizationCommand): Promise<CreateOrganizationResult> {
    // ── Enforce uniqueness ────────────────────────────────────────────────────
    const slugExists = await this.orgRepo.existsBySlug(cmd.slug);
    if (slugExists) {
      throw new ConflictException(`Organization slug "${cmd.slug}" is already taken`);
    }

    // ── Create Organization aggregate ─────────────────────────────────────────
    const organization = Organization.create({
      name: cmd.name,
      slug: cmd.slug,
      plan: cmd.plan,
      ownerEmail: cmd.ownerEmail,
    });

    await this.orgRepo.save(organization);

    // ── Create Org Admin user ─────────────────────────────────────────────────
    const passwordHash = await this.passwordHasher.hash(cmd.ownerPassword);
    const owner = User.create({
      organizationId: organization.id,
      email: cmd.ownerEmail,
      passwordHash,
      firstName: cmd.ownerFirstName,
      lastName: cmd.ownerLastName,
      phone: cmd.ownerPhone,
      role: UserRole.ORG_ADMIN,
    });

    await this.userRepo.save(owner);

    // ── Dispatch domain events ────────────────────────────────────────────────
    await this.eventPublisher.publishAll([
      ...organization.domainEvents,
      ...owner.domainEvents,
    ]);
    organization.clearDomainEvents();
    owner.clearDomainEvents();

    return { organizationId: organization.id, userId: owner.id };
  }
}
