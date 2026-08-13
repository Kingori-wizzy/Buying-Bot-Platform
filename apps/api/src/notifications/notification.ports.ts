import { Injectable } from '@nestjs/common';

export interface NotificationMessage {
  readonly recipient: string;
  readonly subject?: string;
  readonly body: string;
}

export interface ProviderReceipt {
  readonly provider: string;
  readonly reference: string;
}

export interface EmailProvider {
  send(message: NotificationMessage): Promise<ProviderReceipt>;
}

export interface SmsProvider {
  send(message: NotificationMessage): Promise<ProviderReceipt>;
}

export interface WhatsAppProvider {
  send(message: NotificationMessage): Promise<ProviderReceipt>;
}

@Injectable()
export class RecordingEmailProvider implements EmailProvider {
  readonly messages: NotificationMessage[] = [];

  send(message: NotificationMessage): Promise<ProviderReceipt> {
    this.messages.push(message);
    return Promise.resolve({
      provider: 'recording-email',
      reference: `email-${String(this.messages.length)}`,
    });
  }
}

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  send(message: NotificationMessage): Promise<ProviderReceipt> {
    // Do not log message bodies; they may contain PII.
    return Promise.resolve({
      provider: 'console-sms',
      reference: `sms-${Date.now().toString(36)}-${String(message.recipient.length)}`,
    });
  }
}

@Injectable()
export class StubWhatsAppProvider implements WhatsAppProvider {
  send(_message: NotificationMessage): Promise<ProviderReceipt> {
    return Promise.reject(new Error('WhatsApp provider is not configured'));
  }
}
