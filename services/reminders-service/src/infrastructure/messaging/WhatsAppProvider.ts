import { Injectable, Logger } from '@nestjs/common';
import { IMessagingProvider, SendMessageOptions, SendMessageResult } from '../../domain/ports/MessagingProvider';

/**
 * WhatsApp Cloud API (Meta) adapter.
 * Template messages must be pre-approved in the Meta Business Manager.
 */
@Injectable()
export class WhatsAppProvider implements IMessagingProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly apiToken = process.env.WHATSAPP_API_TOKEN!;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  private readonly apiBase = 'https://graph.facebook.com/v20.0';

  async send(opts: SendMessageOptions): Promise<SendMessageResult> {
    if (opts.channel !== 'WHATSAPP') {
      throw new Error('WhatsAppProvider only handles WHATSAPP channel');
    }

    // Build template parameter components
    const components = Object.keys(opts.variables).length > 0
      ? [
          {
            type: 'body',
            parameters: Object.values(opts.variables).map((value) => ({
              type: 'text',
              text: value,
            })),
          },
        ]
      : [];

    const body = {
      messaging_product: 'whatsapp',
      to: opts.to.replace(/\D/g, ''), // strip non-digits
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: 'es' },
        components,
      },
    };

    try {
      const response = await fetch(
        `${this.apiBase}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`WhatsApp API error: ${err}`);
        return { externalId: '', status: 'failed', error: err };
      }

      const data = (await response.json()) as { messages: [{ id: string }] };
      const externalId = data.messages[0]?.id ?? '';

      this.logger.log(`WhatsApp message sent to ${opts.to}, id: ${externalId}`);
      return { externalId, status: 'sent' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`WhatsApp send failed: ${message}`);
      return { externalId: '', status: 'failed', error: message };
    }
  }
}
