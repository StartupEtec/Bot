import http from 'node:http';

import { assertRuntimeConfig, config } from './config.js';
import { createLogger } from './logger.js';
import { createKnowledge } from './knowledge/answerEngine.js';
import { fromMobilePayload, fromWebPayload, PayloadValidationError } from './adapters/messages.js';
import { TelegramClient } from './services/telegram.js';
import { BackendClient } from './services/backendClient.js';
import { ChannelResponder } from './services/channelResponder.js';
import { UserLinkingService } from './services/userLinking.js';
import { NotificationService } from './services/notifications.js';
import { createBot } from './bot.js';

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error('Cuerpo demasiado grande'));
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function isChannelAuthorized(request) {
  if (!config.channelAuthToken) return true;
  return request.headers['x-channel-token'] === config.channelAuthToken;
}

function isTelegramAuthorized(request) {
  if (!config.webhookSecret) return true;
  return request.headers['x-telegram-bot-api-secret-token'] === config.webhookSecret;
}

function startGatewayServer({ bot, responder, logger }) {
  const server = http.createServer(async (request, response) => {
    const pathname = (request.url || '').split('?')[0];

    if (request.method === 'GET' && pathname === '/health') {
      json(response, 200, { ok: true, service: 'laborin-bot' });
      return;
    }

    if (request.method !== 'POST') {
      json(response, 404, { ok: false, error: 'Not found' });
      return;
    }

    if (pathname === config.webhookPath) {
      if (!isTelegramAuthorized(request)) {
        json(response, 401, { ok: false, error: 'Unauthorized' });
        return;
      }

      try {
        const update = await readJson(request);
        await bot.handleUpdate(update);
        json(response, 200, { ok: true });
      } catch (error) {
        logger.error?.(`Webhook inválido: ${error.message}`);
        json(response, 400, { ok: false, error: error.message });
      }
      return;
    }

    if (pathname === config.webChannelPath || pathname === config.mobileChannelPath) {
      if (!isChannelAuthorized(request)) {
        json(response, 401, { ok: false, error: 'Unauthorized' });
        return;
      }

      try {
        const body = await readJson(request);
        const message =
          pathname === config.webChannelPath
            ? fromWebPayload(body)
            : fromMobilePayload(body);

        await bot.handleMessage(message);

        const responses = responder.drain(message.channel, message.chatId);
        json(response, 200, {
          ok: true,
          channel: message.channel,
          count: responses.length,
          messages: responses.map((item) => item.text),
        });
      } catch (error) {
        const status = error instanceof PayloadValidationError ? 400 : 500;
        if (status === 500) logger.error?.(`Error en canal: ${error.message}`);
        json(response, status, { ok: false, error: error.message });
      }
      return;
    }

    json(response, 404, { ok: false, error: 'Not found' });
  });

  server.listen(config.port, '0.0.0.0', () => {
    logger.info?.(
      `Gateway HTTP en :${config.port} (${config.webChannelPath}, ${config.mobileChannelPath}, ${config.webhookPath})`,
    );
  });

  return server;
}

async function main() {
  const logger = createLogger(config.logLevel);

  assertRuntimeConfig(logger);

  const telegram = new TelegramClient({
    token: config.botToken,
    apiBase: config.telegramApiBase,
    dryRun: config.dryRun,
    logger,
  });

  const backend = new BackendClient({
    baseUrl: config.backendBaseUrl,
    accessToken: config.backendAccessToken,
    logger,
  });

  const responder = new ChannelResponder({ telegram, logger });
  const linking = new UserLinkingService({ secret: config.linkingSecret, logger });

  const knowledge = createKnowledge({
    appUrl: config.appUrl,
    landingUrl: config.landingUrl,
    apiBaseUrl: config.backendBaseUrl,
  });

  const notifications = new NotificationService({
    telegram,
    responder,
    backend,
    linking,
    config,
    logger,
  });

  const bot = createBot({
    config,
    telegram,
    responder,
    linking,
    knowledge,
    backend,
    notifications,
    logger,
  });

  await bot.registerCommands();

  if (config.webhookUrl) {
    await telegram.setWebhook({
      url: config.webhookUrl,
      secretToken: config.webhookSecret,
    });
  }

  const server = startGatewayServer({ bot, responder, logger });

  const controller = new AbortController();
  const shutdown = () => {
    logger.info?.('Señal de salida recibida.');
    bot.stop();
    controller.abort();
    server.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  if (config.webhookUrl) {
    return;
  }

  await bot.startPolling({ signal: controller.signal });
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exitCode = 1;
});
