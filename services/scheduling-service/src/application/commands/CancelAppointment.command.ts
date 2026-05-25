import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Appointment } from '../../domain/entities/Appointment';
import { IAppointmentRepository, APPOINTMENT_REPOSITORY } from '../../domain/ports/AppointmentRepository';
import { IEventPublisher } from '@dental/shared-kernel';

export class CancelAppointmentCommand {
  constructor(
    public readonly appointmentId: string,
    public readonly organizationId: string,
    public readonly reason: string,
    public readonly cancelledByUserId: string,
  ) {}
}

@CommandHandler(CancelAppointmentCommand)
export class CancelAppointmentHandler implements ICommandHandler<CancelAppointmentCommand, void> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly repo: IAppointmentRepository,
    @Inject('EVENT_PUBLISHER') private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(cmd: CancelAppointmentCommand): Promise<void> {
    const appointment = await this.repo.findById(cmd.appointmentId);

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.organizationId !== cmd.organizationId) {
      throw new ForbiddenException('Appointment does not belong to your organization');
    }

    appointment.cancel(cmd.reason, cmd.cancelledByUserId);
    await this.repo.save(appointment);

    await this.eventPublisher.publishAll(appointment.domainEvents);
    appointment.clearDomainEvents();
  }
}
