export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly template: string;
  readonly data: Readonly<Record<string, string>>;
  readonly createdAt: string;
}

/**
 * Notification/email port. Stub implementations must not claim delivery to a
 * real provider.
 */
export interface EmailPort {
  send(message: Omit<EmailMessage, 'createdAt'>): Promise<void>;
  readonly sent: readonly EmailMessage[];
}

export class InMemoryEmailPort implements EmailPort {
  readonly sent: EmailMessage[] = [];

  send(message: Omit<EmailMessage, 'createdAt'>): Promise<void> {
    this.sent.push({
      ...message,
      createdAt: new Date().toISOString(),
    });
    return Promise.resolve();
  }
}
