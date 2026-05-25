import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ReminderScheduler } from '../../infrastructure/scheduler/ReminderScheduler';
import { AppointmentCreatedEvent } from '@dental/contracts';

const EXCHANGE = 'dental.events';
const QUEUE = 'reminders.appointment.created';
const ROUTING_KEY = 'scheduling.appointment.created';

/**
 * Event handler that listens to appointment creation events from RabbitMQ
 * and schedules the appropriate reminder sequence.
 */
@Injectable()
export class AppointmentCreatedHandler implements OnModuleInit {
  private readonly logger = new Logger(AppointmentCreatedHandler.name);

  constructor(private readonly scheduler: ReminderScheduler) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://localhost';
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    channel.prefetch(10);

    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString()) as AppointmentCreatedEvent;
        this.logger.log(`Received appointment.created: ${event.appointmentId}`);

        await this.scheduler.scheduleForAppointment({
          appointmentId: event.appointmentId,
          organizationId: event.organizationId,
          patientId: event.patientId,
          scheduledAt: new Date(event.scheduledAt),
          channel: 'WHATSAPP',
          templatePayload: {
            patient_name: event.patientName,
            doctor_name: event.doctorName,
            branch_name: event.branchName,
            date: new Date(event.scheduledAt).toLocaleDateString('es-SV', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            }),
            time: new Date(event.scheduledAt).toLocaleTimeString('es-SV', {
              hour: '2-digit', minute: '2-digit',
            }),
          },
        });

        channel.ack(msg);
      } catch (err) {
        this.logger.error(`Failed to handle appointment.created: ${err}`);
        channel.nack(msg, false, false); // dead-letter, don't requeue
      }
    });

    this.logger.log('Listening for appointment.created events');
  }
}
