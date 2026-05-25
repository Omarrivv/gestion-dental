import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Appointment } from '../../domain/entities/Appointment';
import { IAppointmentRepository, APPOINTMENT_REPOSITORY } from '../../domain/ports/AppointmentRepository';
import { IEventPublisher } from '@dental/shared-kernel';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export class CreateAppointmentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly branchId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly treatmentType: string,
    public readonly scheduledAt: Date,
    public readonly durationMins: number,
    public readonly reason: string | undefined,
    public readonly requestedByUserId: string,
  ) {}
}

@CommandHandler(CreateAppointmentCommand)
export class CreateAppointmentHandler implements ICommandHandler<CreateAppointmentCommand, { appointmentId: string }> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly repo: IAppointmentRepository,
    @Inject('EVENT_PUBLISHER') private readonly eventPublisher: IEventPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async execute(cmd: CreateAppointmentCommand): Promise<{ appointmentId: string }> {
    // ── Load denormalized data for the event payload ───────────────────────
    const [patient, doctor, branch] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: cmd.patientId, organizationId: cmd.organizationId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      }),
      this.prisma.user.findFirst({
        where: { id: cmd.doctorId, organizationId: cmd.organizationId },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.branch.findFirst({
        where: { id: cmd.branchId, organizationId: cmd.organizationId },
        select: { id: true, name: true },
      }),
    ]);

    if (!patient) throw new NotFoundException('Patient not found in this organization');
    if (!doctor) throw new NotFoundException('Doctor not found in this organization');
    if (!branch) throw new NotFoundException('Branch not found in this organization');

    // ── Check for scheduling conflicts ────────────────────────────────────
    const endAt = new Date(cmd.scheduledAt.getTime() + cmd.durationMins * 60_000);
    const conflicts = await this.repo.findOverlapping(
      cmd.doctorId,
      cmd.branchId,
      cmd.scheduledAt,
      endAt,
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Doctor already has an appointment between ${cmd.scheduledAt.toISOString()} and ${endAt.toISOString()}`,
      );
    }

    // ── Create aggregate ──────────────────────────────────────────────────
    const appointment = Appointment.create({
      organizationId: cmd.organizationId,
      branchId: cmd.branchId,
      patientId: cmd.patientId,
      doctorId: cmd.doctorId,
      treatmentType: cmd.treatmentType,
      scheduledAt: cmd.scheduledAt,
      durationMins: cmd.durationMins,
      reason: cmd.reason,
      patientPhone: patient.phone,
      patientName: `${patient.firstName} ${patient.lastName}`,
      branchName: branch.name,
      doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    });

    await this.repo.save(appointment);

    await this.eventPublisher.publishAll(appointment.domainEvents);
    appointment.clearDomainEvents();

    return { appointmentId: appointment.id };
  }
}
