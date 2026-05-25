import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { IMessagingProvider, MESSAGING_PROVIDER } from '../../domain/ports/MessagingProvider';
import { Inject } from '@nestjs/common';
import { subMinutes } from 'date-fns';

/**
 * ReminderScheduler — runs every minute to dispatch due reminders.
 * For production, consider Bull/BullMQ for distributed, retryable queues.
 */
@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_PROVIDER) private readonly messaging: IMessagingProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = now; // dispatch if scheduledFor <= now

    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: windowEnd },
      },
      include: {
        patient: { select: { phone: true, email: true } },
      },
      take: 50, // process in batches
    });

    if (dueReminders.length === 0) return;

    this.logger.log(`Dispatching ${dueReminders.length} reminders`);

    for (const reminder of dueReminders) {
      try {
        // Optimistic lock: mark as sent before dispatching to avoid double-send
        const updated = await this.prisma.reminder.updateMany({
          where: { id: reminder.id, status: 'SCHEDULED' },
          data: { status: 'SENT', sentAt: now },
        });

        if (updated.count === 0) continue; // another instance grabbed it

        const result = await this.messaging.send({
          to: reminder.patient.phone,
          channel: reminder.channel as 'WHATSAPP' | 'SMS' | 'EMAIL',
          templateName: reminder.templateName ?? 'appointment_reminder',
          variables: reminder.payload as Record<string, string>,
        });

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: result.status === 'failed' ? 'FAILED' : 'SENT',
            externalId: result.externalId || null,
            sentAt: result.status !== 'failed' ? now : null,
            failedAt: result.status === 'failed' ? now : null,
            failureReason: result.error ?? null,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to dispatch reminder ${reminder.id}: ${err}`);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'FAILED', failedAt: now, failureReason: String(err) },
        });
      }
    }
  }

  /**
   * Listen for AppointmentCreated event from RabbitMQ and schedule reminders:
   * - 48h before: first reminder
   * - 2h before: final reminder
   */
  async scheduleForAppointment(opts: {
    appointmentId: string;
    organizationId: string;
    patientId: string;
    scheduledAt: Date;
    channel: 'WHATSAPP' | 'SMS';
    templatePayload: Record<string, string>;
  }): Promise<void> {
    const { appointmentId, organizationId, patientId, scheduledAt, channel, templatePayload } = opts;

    const reminders = [
      {
        scheduledFor: subMinutes(scheduledAt, 48 * 60),
        templateName: 'appointment_reminder_48h',
      },
      {
        scheduledFor: subMinutes(scheduledAt, 2 * 60),
        templateName: 'appointment_reminder_2h',
      },
    ].filter((r) => r.scheduledFor > new Date()); // only future reminders

    await this.prisma.reminder.createMany({
      data: reminders.map((r) => ({
        organizationId,
        appointmentId,
        patientId,
        channel,
        status: 'SCHEDULED',
        scheduledFor: r.scheduledFor,
        templateName: r.templateName,
        payload: templatePayload,
      })),
    });
  }
}
