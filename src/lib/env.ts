function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function getEnv() {
  return {
    databaseUrl: requireEnv("DATABASE_URL"),
    customerSessionSecret: requireEnv("CUSTOMER_SESSION_SECRET"),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    paymentMode: process.env.PAYMENT_MODE ?? "manual",
    /** Optional OpenRouter key — sparse AI fallback when keyword score < 3. */
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
    /** Optional model id (default openrouter/free). */
    openRouterModel: process.env.OPENROUTER_MODEL ?? "",
    /** Optional — Discord incoming webhook for critical support tickets. */
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? "",
  };
}

/** Secure cookies only when the public app origin is HTTPS (HTTP VPS would drop them). */
export function sessionCookieSecure() {
  return getEnv().appUrl.startsWith("https://");
}
