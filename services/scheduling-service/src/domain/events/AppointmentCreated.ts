import { DomainEvent } from '@dental/shared-kernel';

interface Payload {
  appointmentId: string;
  organizationId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  treatmentType: string;
  scheduledAt: string;
  durationMinutes: number;
  patientPhone: string;
  patientName: string;
  branchName: string;
  doctorName: string;
}

export class AppointmentCreatedDomainEvent extends DomainEvent {
  readonly eventName = 'scheduling.appointment.created' as const;
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly treatmentType: string;
  readonly scheduledAt: string;
  readonly durationMinutes: number;
  readonly patientPhone: string;
  readonly patientName: string;
  readonly branchName: string;
  readonly doctorName: string;

  constructor(payload: Payload) {
    super();
    Object.assign(this, payload);
  }
}

export class AppointmentCancelledDomainEvent extends DomainEvent {
  readonly eventName = 'scheduling.appointment.cancelled' as const;
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly patientId: string;
  readonly reason: string;
  readonly cancelledBy: string;

  constructor(payload: { appointmentId: string; organizationId: string; patientId: string; reason: string; cancelledBy: string }) {
    super();
    Object.assign(this, payload);
  }
}

export class AppointmentCompletedDomainEvent extends DomainEvent {
  readonly eventName = 'scheduling.appointment.completed' as const;
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly treatmentType: string;

  constructor(payload: { appointmentId: string; organizationId: string; branchId: string; patientId: string; doctorId: string; treatmentType: string }) {
    super();
    Object.assign(this, payload);
  }
}
