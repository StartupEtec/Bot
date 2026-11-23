import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function parseEnv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;

  const values = parseEnv(fs.readFileSync(ENV_PATH, 'utf8'));

  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on', 'si', 'sí'].includes(String(value).toLowerCase());
}

function integer(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimTrailingSlash(value) {
  return String(value ?? '').replace(/\/+$/, '');
}

export const config = Object.freeze({
  botToken: String(process.env.TELEGRAM_BOT_TOKEN ?? '').trim(),
  telegramApiBase: trimTrailingSlash(
    process.env.TELEGRAM_API_BASE || 'https://api.telegram.org',
  ),
  adminChatIds: list(process.env.TELEGRAM_ADMIN_CHAT_IDS),
  allowedChatIds: list(process.env.TELEGRAM_ALLOWED_CHAT_IDS),
  dryRun: bool(process.env.BOT_DRY_RUN, false),
  pollingTimeout: integer(process.env.BOT_POLLING_TIMEOUT, 30),
  retryDelayMs: integer(process.env.BOT_RETRY_DELAY_MS, 2000),
  webhookUrl: String(process.env.TELEGRAM_WEBHOOK_URL ?? '').trim(),
  webhookPath: String(process.env.TELEGRAM_WEBHOOK_PATH || '/telegram/webhook').trim(),
  webhookSecret: String(process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim(),
  webChannelPath: String(process.env.WEB_CHANNEL_PATH || '/channels/web').trim(),
  mobileChannelPath: String(process.env.MOBILE_CHANNEL_PATH || '/channels/mobile').trim(),
  channelAuthToken: String(process.env.CHANNEL_AUTH_TOKEN ?? '').trim(),
  linkingSecret: String(process.env.BOT_LINKING_SECRET ?? '').trim(),
  port: integer(process.env.PORT, 3001),
  backendBaseUrl: trimTrailingSlash(process.env.LABORIN_API_BASE_URL || ''),
  backendAccessToken: String(process.env.LABORIN_API_ACCESS_TOKEN ?? '').trim(),
  appUrl: String(process.env.LABORIN_APP_URL || 'https://app.laborin.app/').trim(),
  landingUrl: String(process.env.LABORIN_LANDING_URL || 'https://laborin.app/').trim(),
  logLevel: String(process.env.LOG_LEVEL || 'info').toLowerCase(),
});

export function assertRuntimeConfig(logger = console) {
  if (!config.channelAuthToken) {
    logger.warn?.(
      'CHANNEL_AUTH_TOKEN vacío: los endpoints /channels/* quedan sin autenticar.',
    );
  }

  if (config.dryRun) {
    logger.warn?.('BOT_DRY_RUN=true: no se llama a Telegram; se simulan los envíos.');
    return;
  }

  if (!config.botToken) {
    throw new Error(
      'Falta TELEGRAM_BOT_TOKEN. Configuralo en .env o usá BOT_DRY_RUN=true para probar sin token.',
    );
  }

  if (config.webhookUrl && !config.webhookUrl.startsWith('https://')) {
    logger.warn?.('TELEGRAM_WEBHOOK_URL debe ser HTTPS para Telegram en producción.');
  }
}
