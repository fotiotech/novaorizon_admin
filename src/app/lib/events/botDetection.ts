const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /bingpreview/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegram/i,
  /discordbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /pinterest/i,
  /vkshare/i,
  /w3c_validator/i,
  /lighthouse/i,
  /pingdom/i,
  /uptimerobot/i,
  /headlesschrome/i,
  /phantomjs/i,
];

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_PATTERNS.some((re) => re.test(userAgent));
}

export function detectDevice(
  ua: string,
): "mobile" | "tablet" | "desktop" | "unknown" {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  if (/mozilla|chrome|safari|firefox/i.test(ua)) return "desktop";
  return "unknown";
}
