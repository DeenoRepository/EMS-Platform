export interface SrmWebhookAuthPolicy {
  secret: string | null;
  allowUnsigned: boolean;
}

const WEBHOOK_SECRET_KEYS = ['webhookSecret', 'apiToken', 'apiKey', 'token'] as const;

export function getSrmWebhookAuthPolicy(authConfig: unknown): SrmWebhookAuthPolicy {
  if (!authConfig || typeof authConfig !== 'object') {
    return { secret: null, allowUnsigned: false };
  }

  const config = authConfig as Record<string, unknown>;
  const secret = WEBHOOK_SECRET_KEYS
    .map((key) => config[key])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return {
    secret: secret?.trim() || null,
    allowUnsigned: config.allowUnsignedWebhooks === true,
  };
}

export function hasSecureSrmWebhookAuth(authConfig: unknown): boolean {
  const policy = getSrmWebhookAuthPolicy(authConfig);
  return policy.secret !== null || policy.allowUnsigned;
}
