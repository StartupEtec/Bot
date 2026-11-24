import { config } from './config.js';
import { createLogger } from './logger.js';
import { createKnowledge } from './knowledge/answerEngine.js';
import { fromMobilePayload, fromWebPayload } from './adapters/messages.js';
import { TelegramClient } from './services/telegram.js';
import { BackendClient } from './services/backendClient.js';
import { ChannelResponder } from './services/channelResponder.js';
import { UserLinkingService } from './services/userLinking.js';
import { NotificationService } from './services/notifications.js';
import { createBot } from './bot.js';

const logger = createLogger('error');

const telegram = new TelegramClient({
  token: 'dry-run-token',
  dryRun: true,
  logger,
});

const backend = new BackendClient({
  baseUrl: config.backendBaseUrl,
  accessToken: config.backendAccessToken,
  logger,
});

const responder = new ChannelResponder({ telegram, logger });
const linking = new UserLinkingService({ secret: 'demo-secret', logger });

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
  config: { ...config, adminChatIds: ['1001'] },
  logger,
});

const bot = createBot({
  config: { ...config, adminChatIds: ['1001'], allowedChatIds: [] },
  telegram,
  responder,
  linking,
  knowledge,
  backend,
  notifications,
  logger,
});

function messageUpdate(chatId, text) {
  return {
    update_id: chatId,
    message: {
      message_id: chatId,
      chat: { id: chatId },
      from: { id: chatId, is_bot: false },
      text,
    },
  };
}

await bot.handleUpdate(messageUpdate(1001, '/start'));
await bot.handleMessage(fromWebPayload({ sessionId: 'web-demo-1', text: '¿Qué es Laborin?' }));

const startToken = linking.createStartToken({ userId: 'user-demo', channel: 'mobile' });
await bot.handleMessage(fromMobilePayload({ userId: 'user-demo', role: 'client', startParam: startToken }));
await bot.handleMessage(fromMobilePayload({ userId: 'user-demo', text: '¿Cómo cambio de rol?' }));

await bot.handleUpdate(messageUpdate(1001, '/notificar'));

await notifications.send(1001, {
  title: 'Notificación de prueba',
  message: 'Este mensaje simula un aviso de cambio de estado de una orden.',
  level: 'info',
});

console.log(
  JSON.stringify(
    {
      telegram: telegram.calls,
      web: responder.drain('web', 'web-demo-1'),
      mobile: responder.drain('mobile', 'mobile:user-demo'),
      linkedUser: linking.getByUser('user-demo'),
    },
    null,
    2,
  ),
);
