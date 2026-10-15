import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  CreateSecretCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-secrets-manager";

// Feature-specific env vars, with a fallback to the global AWS ones.
const region =
  process.env.FACEBOOK_ADS_AWS_REGION || process.env.AWS_REGION || "us-east-1";

const SECRET_NAME =
  process.env.FACEBOOK_ADS_SECRET_NAME || "novaorizon/facebook-ads";

// Explicit credentials for this client so we don't collide with the
// app-wide AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY used elsewhere.
const explicitCredentials =
  process.env.FACEBOOK_ADS_AWS_ACCESS_KEY_ID &&
  process.env.FACEBOOK_ADS_AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.FACEBOOK_ADS_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.FACEBOOK_ADS_AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

let client: SecretsManagerClient | null = null;
function getClient() {
  if (!client) {
    client = new SecretsManagerClient({
      region,
      // If undefined, the SDK falls back to the default chain
      // (~/.aws/credentials, IAM role, ECS task role, etc.)
      credentials: explicitCredentials,
    });
  }
  return client;
}

type SecretRecord = Record<string, unknown>;

let cache: { value: SecretRecord | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
};
const TTL_MS = 60_000;

export function invalidateSecretCache() {
  cache = { value: null, expiresAt: 0 };
}

export async function getSecret(): Promise<SecretRecord | null> {
  if (cache.value !== null && Date.now() < cache.expiresAt) return cache.value;

  try {
    const res = await getClient().send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME }),
    );
    const raw = res.SecretString ?? "";
    const parsed: SecretRecord = raw ? JSON.parse(raw) : {};
    cache = { value: parsed, expiresAt: Date.now() + TTL_MS };
    return parsed;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      cache = { value: null, expiresAt: Date.now() + TTL_MS };
      return null;
    }
    throw err;
  }
}

export async function putSecret(value: SecretRecord): Promise<void> {
  const SecretString = JSON.stringify(value);

  try {
    await getClient().send(
      new PutSecretValueCommand({ SecretId: SECRET_NAME, SecretString }),
    );
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      await getClient().send(
        new CreateSecretCommand({ Name: SECRET_NAME, SecretString }),
      );
    } else {
      throw err;
    }
  }

  cache = { value, expiresAt: Date.now() + TTL_MS };
}
