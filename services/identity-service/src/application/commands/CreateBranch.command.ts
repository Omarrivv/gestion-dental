import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IBranchRepository, BRANCH_REPOSITORY } from '../../domain/ports/BranchRepository';
import { IEventPublisher } from '@dental/shared-kernel';
import { Branch } from '../../domain/entities/Branch';

export class CreateBranchCommand {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly address: string,
    public readonly city: string,
    public readonly phone?: string,
    public readonly email?: string,
    public readonly timezone?: string,
  ) {}
}

@CommandHandler(CreateBranchCommand)
export class CreateBranchHandler implements ICommandHandler<CreateBranchCommand, { branchId: string }> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject('EVENT_PUBLISHER') private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(cmd: CreateBranchCommand): Promise<{ branchId: string }> {
    const branch = Branch.create({
      organizationId: cmd.organizationId,
      name: cmd.name,
      address: cmd.address,
      city: cmd.city,
      phone: cmd.phone,
      email: cmd.email,
      timezone: cmd.timezone,
    });

    await this.branchRepo.save(branch);

    return { branchId: branch.id };
  }
}
