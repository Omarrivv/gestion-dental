export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');

export interface SendMessageOptions {
  to: string;            // phone number (E.164) or email
  templateName: string;  // WhatsApp template name / SMS template key
  variables: Record<string, string>;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
}

export interface SendMessageResult {
  externalId: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

export interface IMessagingProvider {
  send(opts: SendMessageOptions): Promise<SendMessageResult>;
}
