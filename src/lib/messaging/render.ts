// lib/messaging/render.ts

export interface RenderContext {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  unsubscribeUrl?: string;
  [key: string]: string | undefined;
}

/**
 * Replaces `{{name}}` and `{{ name }}` with the matching context value.
 * Unknown variables render as empty string rather than throwing — a
 * missing `firstName` shouldn't break an entire send.
 */
export function renderTemplate(template: string, ctx: RenderContext): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = ctx[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Extracts the set of `{{var}}` names referenced in a template. */
export function extractVariables(template: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) found.add(m[1]);
  return Array.from(found);
}

/** Wraps plain text into a minimal HTML document. */
export function wrapHtml(body: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:24px;">
    ${body}
  </body>
</html>`;
}

/**
 * Appends the required unsubscribe block to an email body. This is not
 * optional — most jurisdictions require a visible unsubscribe link, and
 * providers (Gmail, Outlook) will mark bulk mail without one as spam.
 */
export function appendUnsubscribe(
  html: string,
  unsubscribeUrl: string,
): string {
  const block = `
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
    <p style="font-size:12px;color:#888;text-align:center;margin:0;">
      You're receiving this because you subscribed on our site.
      <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a>.
    </p>`;
  return html + block;
}

/** SMS equivalent — a short opt-out line. */
export function appendSmsOptOut(body: string): string {
  return `${body}\n\nReply STOP to opt out.`;
}
