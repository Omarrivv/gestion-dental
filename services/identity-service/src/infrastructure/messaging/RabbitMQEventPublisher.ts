import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { DomainEvent, IEventPublisher } from '@dental/shared-kernel';

const EXCHANGE = 'dental.events';

@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQEventPublisher.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://localhost';
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    this.logger.log('Connected to RabbitMQ');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    const content = Buffer.from(JSON.stringify(event));
    this.channel.publish(EXCHANGE, event.eventName, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: event.occurredAt.getTime(),
      messageId: event.eventId,
    });
    this.logger.debug(`Published: ${event.eventName}`);
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
