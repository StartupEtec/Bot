import test from 'node:test';
import assert from 'node:assert/strict';

import { createBot } from '../src/bot.js';
import { fromMobilePayload, fromWebPayload } from '../src/adapters/messages.js';
import { createKnowledge } from '../src/knowledge/answerEngine.js';
import { TelegramClient } from '../src/services/telegram.js';
import { BackendClient } from '../src/services/backendClient.js';
import { ChannelResponder } from '../src/services/channelResponder.js';
import { UserLinkingService } from '../src/services/userLinking.js';
import { NotificationService } from '../src/services/notifications.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

function makeBot(overrides = {}) {
  const telegram = new TelegramClient({ token: 'test', dryRun: true, logger: silent });
  const responder = new ChannelResponder({ telegram, logger: silent });
  const linking = new UserLinkingService({ secret: 'test-secret', logger: silent });
  const backend = new BackendClient({ baseUrl: '', accessToken: '', logger: silent });
  const knowledge = createKnowledge();
  const notifications = new NotificationService({
    telegram,
    responder,
    backend,
    linking,
    config: { adminChatIds: ['1001'] },
    logger: silent,
  });

  const bot = createBot({
    config: {
      adminChatIds: ['1001'],
      allowedChatIds: [],
      pollingTimeout: 0,
      retryDelayMs: 1,
      ...overrides,
    },
    telegram,
    responder,
    linking,
    knowledge,
    backend,
    notifications,
    logger: silent,
  });

  return { bot, telegram, responder, linking };
}

function messageUpdate(chatId, text) {
  return {
    update_id: 1,
    message: { message_id: 7, chat: { id: chatId }, from: { id: chatId }, text },
  };
}

test('/start envía bienvenida con teclado inline', async () => {
  const { bot, telegram } = makeBot();
  await bot.handleUpdate(messageUpdate(1001, '/start'));

  const sent = telegram.calls.find((call) => call.method === 'sendMessage');
  assert.ok(sent);
  assert.match(sent.payload.text, /Laborin/);
  assert.ok(sent.payload.reply_markup.inline_keyboard);
});

test('/start landing muestra el origen del deep link', async () => {
  const { bot, telegram } = makeBot();
  await bot.handleUpdate(messageUpdate(1001, '/start landing'));

  assert.match(telegram.calls.at(-1).payload.text, /Origen: Landing/);
});

test('una pregunta libre usa la base de conocimiento', async () => {
  const { bot, telegram } = makeBot();
  await bot.handleUpdate(messageUpdate(1001, 'cómo funciona laborin'));

  const sent = telegram.calls.find((call) => call.method === 'sendMessage');
  assert.match(sent.payload.text, /Publicá el trabajo/);
});

test('los chats no autorizados son ignorados', async () => {
  const { bot, telegram } = makeBot({ allowedChatIds: ['999'] });
  await bot.handleUpdate(messageUpdate(1001, '/start'));

  assert.equal(telegram.calls.length, 0);
});

test('/notificar solo responde para administradores', async () => {
  const { bot, telegram } = makeBot();

  await bot.handleUpdate(messageUpdate(2002, '/notificar'));
  assert.match(telegram.calls.at(-1).payload.text, /solo para administradores/);

  await bot.handleUpdate(messageUpdate(1001, '/notificar 1001 hola'));
  assert.equal(telegram.calls.filter((call) => call.method === 'sendMessage').length, 3);
});

test('el canal web responda por outbox y no por Telegram', async () => {
  const { bot, telegram, responder } = makeBot();
  const message = fromWebPayload({ sessionId: 'web-1', text: '¿Qué es Laborin?' });

  await bot.handleMessage(message);
  const responses = responder.drain('web', 'web-1');

  assert.equal(telegram.calls.length, 0);
  assert.equal(responses.length, 1);
  assert.match(responses[0].text, /on-demand/);
});

test('el deep link móvil vincula usuario y chat', async () => {
  const { bot, responder, linking } = makeBot();
  const token = linking.createStartToken({ userId: 'u-42', channel: 'mobile' });

  await bot.handleMessage(fromMobilePayload({ userId: 'u-42', startParam: token }));

  assert.equal(linking.getByUser('u-42')?.chatId, 'mobile:u-42');
  const responses = responder.drain('mobile', 'mobile:u-42');
  assert.match(responses[0].text, /Cuenta vinculada/);

  await bot.handleMessage(fromMobilePayload({ userId: 'u-42', text: '¿Cómo cambio de rol?' }));
  assert.match(responder.drain('mobile', 'mobile:u-42')[0].text, /Mi Perfil/);
});
