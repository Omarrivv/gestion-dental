import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/UserRepository';
import { IBranchRepository, BRANCH_REPOSITORY } from '../../domain/ports/BranchRepository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/PasswordHasher';
import { IEventPublisher } from '@dental/shared-kernel';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/value-objects/Role';

export class CreateUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole,
    public readonly branchIds: string[],
    public readonly phone?: string,
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, { userId: string }> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject('EVENT_PUBLISHER') private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(cmd: CreateUserCommand): Promise<{ userId: string }> {
    const emailTaken = await this.userRepo.existsByEmail(cmd.organizationId, cmd.email);
    if (emailTaken) {
      throw new ConflictException(`Email "${cmd.email}" is already registered in this organization`);
    }

    // Validate all branch IDs belong to the organization
    for (const branchId of cmd.branchIds) {
      const branch = await this.branchRepo.findByOrganizationAndId(cmd.organizationId, branchId);
      if (!branch) {
        throw new NotFoundException(`Branch "${branchId}" not found in this organization`);
      }
    }

    const passwordHash = await this.passwordHasher.hash(cmd.password);

    const user = User.create({
      organizationId: cmd.organizationId,
      email: cmd.email,
      passwordHash,
      firstName: cmd.firstName,
      lastName: cmd.lastName,
      phone: cmd.phone,
      role: cmd.role,
      branchIds: cmd.branchIds,
    });

    await this.userRepo.save(user);

    await this.eventPublisher.publishAll(user.domainEvents);
    user.clearDomainEvents();

    return { userId: user.id };
  }
}
