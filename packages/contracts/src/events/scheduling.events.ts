// ─── Scheduling Events ──────────────────────────────────────────────────────
export interface AppointmentCreatedEvent {
  readonly eventName: 'scheduling.appointment.created';
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly treatmentType: string;
  readonly scheduledAt: string; // ISO-8601
  readonly durationMinutes: number;
  readonly patientPhone: string;
  readonly patientName: string;
  readonly branchName: string;
  readonly doctorName: string;
  readonly occurredAt: string;
}

export interface AppointmentConfirmedEvent {
  readonly eventName: 'scheduling.appointment.confirmed';
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly patientId: string;
  readonly occurredAt: string;
}

export interface AppointmentCancelledEvent {
  readonly eventName: 'scheduling.appointment.cancelled';
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly patientId: string;
  readonly reason: string | null;
  readonly cancelledBy: string;
  readonly occurredAt: string;
}

export interface AppointmentCompletedEvent {
  readonly eventName: 'scheduling.appointment.completed';
  readonly appointmentId: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly treatmentType: string;
  readonly occurredAt: string;
}
