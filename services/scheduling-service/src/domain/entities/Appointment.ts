import { AggregateRoot, Guard } from '@dental/shared-kernel';
import { TimeSlot } from '../value-objects/TimeSlot';
import { AppointmentStatus } from '../value-objects/AppointmentStatus';
import { AppointmentCreatedDomainEvent } from '../events/AppointmentCreated';
import { AppointmentCancelledDomainEvent } from '../events/AppointmentCancelled';
import { AppointmentCompletedDomainEvent } from '../events/AppointmentCompleted';

export interface AppointmentProps {
  organizationId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  treatmentType: string;
  status: AppointmentStatus;
  timeSlot: TimeSlot;
  reason?: string;
  internalNotes?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  completedAt?: Date;
  patientPhone: string;   // denormalized for reminders (avoid cross-service join)
  patientName: string;
  branchName: string;
  doctorName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentProps {
  organizationId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  treatmentType: string;
  scheduledAt: Date;
  durationMins?: number;
  reason?: string;
  patientPhone: string;
  patientName: string;
  branchName: string;
  doctorName: string;
}

export class Appointment extends AggregateRoot {
  private props: AppointmentProps;

  private constructor(props: AppointmentProps, id?: string) {
    super(id);
    this.props = props;
  }

  // ── Factory ────────────────────────────────────────────────────────────────
  static create(createProps: CreateAppointmentProps, id?: string): Appointment {
    Guard.againstEmpty(createProps.organizationId, 'Appointment.organizationId');
    Guard.againstEmpty(createProps.branchId, 'Appointment.branchId');
    Guard.againstEmpty(createProps.patientId, 'Appointment.patientId');
    Guard.againstEmpty(createProps.doctorId, 'Appointment.doctorId');
    Guard.againstEmpty(createProps.treatmentType, 'Appointment.treatmentType');

    if (createProps.scheduledAt <= new Date()) {
      throw new Error('Appointment must be scheduled in the future');
    }

    const timeSlot = TimeSlot.create(
      createProps.scheduledAt,
      createProps.durationMins ?? 30,
    );

    const now = new Date();
    const appointment = new Appointment(
      {
        organizationId: createProps.organizationId,
        branchId: createProps.branchId,
        patientId: createProps.patientId,
        doctorId: createProps.doctorId,
        treatmentType: createProps.treatmentType,
        status: AppointmentStatus.PENDING,
        timeSlot,
        reason: createProps.reason,
        patientPhone: createProps.patientPhone,
        patientName: createProps.patientName,
        branchName: createProps.branchName,
        doctorName: createProps.doctorName,
        createdAt: now,
        updatedAt: now,
      },
      id,
    );

    appointment.addDomainEvent(
      new AppointmentCreatedDomainEvent({
        appointmentId: appointment.id,
        organizationId: createProps.organizationId,
        branchId: createProps.branchId,
        patientId: createProps.patientId,
        doctorId: createProps.doctorId,
        treatmentType: createProps.treatmentType,
        scheduledAt: createProps.scheduledAt.toISOString(),
        durationMinutes: timeSlot.durationMinutes,
        patientPhone: createProps.patientPhone,
        patientName: createProps.patientName,
        branchName: createProps.branchName,
        doctorName: createProps.doctorName,
      }),
    );

    return appointment;
  }

  static reconstitute(props: AppointmentProps, id: string): Appointment {
    return new Appointment(props, id);
  }

  // ── Behavior ──────────────────────────────────────────────────────────────
  confirm(): void {
    this.assertStatus([AppointmentStatus.PENDING], 'confirm');
    this.props.status = AppointmentStatus.CONFIRMED;
    this.props.updatedAt = new Date();
  }

  start(): void {
    this.assertStatus([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED], 'start');
    this.props.status = AppointmentStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();
  }

  complete(notes?: string): void {
    this.assertStatus([AppointmentStatus.IN_PROGRESS], 'complete');
    this.props.status = AppointmentStatus.COMPLETED;
    this.props.completedAt = new Date();
    if (notes) this.props.internalNotes = notes;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new AppointmentCompletedDomainEvent({
        appointmentId: this.id,
        organizationId: this.props.organizationId,
        branchId: this.props.branchId,
        patientId: this.props.patientId,
        doctorId: this.props.doctorId,
        treatmentType: this.props.treatmentType,
      }),
    );
  }

  cancel(reason: string, cancelledBy: string): void {
    this.assertStatus(
      [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
      'cancel',
    );
    this.props.status = AppointmentStatus.CANCELLED;
    this.props.cancelReason = reason;
    this.props.cancelledAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new AppointmentCancelledDomainEvent({
        appointmentId: this.id,
        organizationId: this.props.organizationId,
        patientId: this.props.patientId,
        reason,
        cancelledBy,
      }),
    );
  }

  markNoShow(): void {
    this.assertStatus([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED], 'markNoShow');
    this.props.status = AppointmentStatus.NO_SHOW;
    this.props.updatedAt = new Date();
  }

  private assertStatus(allowed: AppointmentStatus[], action: string): void {
    if (!allowed.includes(this.props.status)) {
      throw new Error(
        `Cannot "${action}" appointment with status "${this.props.status}". Allowed: ${allowed.join(', ')}`,
      );
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get organizationId(): string { return this.props.organizationId; }
  get branchId(): string { return this.props.branchId; }
  get patientId(): string { return this.props.patientId; }
  get doctorId(): string { return this.props.doctorId; }
  get treatmentType(): string { return this.props.treatmentType; }
  get status(): AppointmentStatus { return this.props.status; }
  get timeSlot(): TimeSlot { return this.props.timeSlot; }
  get scheduledAt(): Date { return this.props.timeSlot.startAt; }
  get reason(): string | undefined { return this.props.reason; }
  get patientPhone(): string { return this.props.patientPhone; }
  get patientName(): string { return this.props.patientName; }
  get createdAt(): Date { return this.props.createdAt; }
}
