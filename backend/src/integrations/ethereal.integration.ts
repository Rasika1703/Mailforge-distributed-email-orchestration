import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../config/logger';

export interface SenderCredentials {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}

export interface SendEmailInput {
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
}

function createTransporter(creds: SenderCredentials): Transporter {
  return nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpPort === 465,
    auth: {
      user: creds.smtpUser,
      pass: creds.smtpPassword,
    },
  });
}

export async function sendEmail(
  creds: SenderCredentials,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const transporter = createTransporter(creds);

  const info = await transporter.sendMail({
    from: input.fromEmail,
    to: input.to,
    subject: input.subject,
    html: input.body,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  logger.info(
    { messageId: info.messageId, to: input.to, previewUrl },
    'EMAIL_SENT via SMTP',
  );

  return { messageId: info.messageId, previewUrl };
}

export interface EtherealAccount {
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}


export async function createEtherealAccount(): Promise<EtherealAccount> {
  const account = await nodemailer.createTestAccount();
  return {
    email: account.user,
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    smtpUser: account.user,
    smtpPassword: account.pass,
  };
}
