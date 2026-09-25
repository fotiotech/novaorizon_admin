// lib/messaging/providers.ts

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional reply-to. */
  replyTo?: string;
  /** Optional headers — used for List-Unsubscribe. */
  headers?: Record<string, string>;
}

export interface SendSmsInput {
  to: string;
  body: string;
}

export interface SendResult {
  providerMessageId: string;
  providerName: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Email — Resend by default.
// To swap to Postmark / SES, rewrite the body of sendEmail and the
// `EMAIL_PROVIDER` switch. The caller never sees the difference.
// ─────────────────────────────────────────────────────────────────────
async function sendViaResend(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) throw new ProviderError("RESEND_API_KEY is not set", "resend");
  if (!from) throw new ProviderError("EMAIL_FROM is not set", "resend");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
      headers: input.headers,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 429 and 5xx are retryable, 4xx generally aren't.
    const retryable = res.status === 429 || res.status >= 500;
    throw new ProviderError(
      `Resend ${res.status}: ${text || res.statusText}`,
      "resend",
      retryable,
    );
  }

  const data = await res.json();
  return { providerMessageId: data.id, providerName: "resend" };
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const provider = process.env.EMAIL_PROVIDER || "resend";
  switch (provider) {
    case "resend":
      return sendViaResend(input);
    default:
      throw new ProviderError(`Unknown EMAIL_PROVIDER "${provider}"`, provider);
  }
}

// ─────────────────────────────────────────────────────────────────────
// SMS — Twilio by default.
// Africa's Talking is also common in CM; swap sendSms to switch.
// ─────────────────────────────────────────────────────────────────────
async function sendViaTwilio(input: SendSmsInput): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.SMS_FROM;

  if (!sid || !token || !from) {
    throw new ProviderError("Twilio credentials not configured", "twilio");
  }

  const body = new URLSearchParams({
    To: input.to,
    From: from,
    Body: input.body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status >= 500;
    throw new ProviderError(
      `Twilio ${res.status}: ${text || res.statusText}`,
      "twilio",
      retryable,
    );
  }

  const data = await res.json();
  return { providerMessageId: data.sid, providerName: "twilio" };
}

export async function sendSms(input: SendSmsInput): Promise<SendResult> {
  const provider = process.env.SMS_PROVIDER || "twilio";
  switch (provider) {
    case "twilio":
      return sendViaTwilio(input);
    default:
      throw new ProviderError(`Unknown SMS_PROVIDER "${provider}"`, provider);
  }
}
