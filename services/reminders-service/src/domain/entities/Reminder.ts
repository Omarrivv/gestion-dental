import { Entity, Guard } from '@dental/shared-kernel';

export enum ReminderChannel {
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum ReminderStatus {
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ReminderProps {
  organizationId: string;
  appointmentId: string;
  patientId: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  scheduledFor: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  externalId?: string;
  templateName: string;
  payload: Record<string, string>; // template variables
}

export class Reminder extends Entity {
  private props: ReminderProps;

  private constructor(props: ReminderProps, id?: string) {
    super(id);
    this.props = props;
  }

  static schedule(
    opts: Omit<ReminderProps, 'status' | 'sentAt' | 'deliveredAt' | 'failedAt' | 'externalId'>,
    id?: string,
  ): Reminder {
    Guard.againstEmpty(opts.organizationId, 'Reminder.organizationId');
    Guard.againstEmpty(opts.appointmentId, 'Reminder.appointmentId');

    return new Reminder({ ...opts, status: ReminderStatus.SCHEDULED }, id);
  }

  static reconstitute(props: ReminderProps, id: string): Reminder {
    return new Reminder(props, id);
  }

  markSent(externalId: string): void {
    this.props.status = ReminderStatus.SENT;
    this.props.sentAt = new Date();
    this.props.externalId = externalId;
  }

  markDelivered(): void {
    this.props.status = ReminderStatus.DELIVERED;
    this.props.deliveredAt = new Date();
  }

  markFailed(reason: string): void {
    this.props.status = ReminderStatus.FAILED;
    this.props.failedAt = new Date();
    this.props.failureReason = reason;
  }

  cancel(): void {
    if (this.props.status !== ReminderStatus.SCHEDULED) {
      throw new Error(`Cannot cancel a ${this.props.status} reminder`);
    }
    this.props.status = ReminderStatus.CANCELLED;
  }

  get organizationId(): string { return this.props.organizationId; }
  get appointmentId(): string { return this.props.appointmentId; }
  get channel(): ReminderChannel { return this.props.channel; }
  get status(): ReminderStatus { return this.props.status; }
  get scheduledFor(): Date { return this.props.scheduledFor; }
  get templateName(): string { return this.props.templateName; }
  get payload(): Record<string, string> { return { ...this.props.payload }; }
}
