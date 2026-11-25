import test from 'node:test';
import assert from 'node:assert/strict';

import { createCallbackHandler } from '../src/handlers/callbacks.js';
import { createKnowledge } from '../src/knowledge/answerEngine.js';
import { ChannelResponder } from '../src/services/channelResponder.js';
import { TelegramClient } from '../src/services/telegram.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

function makeHandler(adminChatIds = ['1001']) {
  const telegram = new TelegramClient({ token: 'test', dryRun: true, logger: silent });
  const responder = new ChannelResponder({ telegram, logger: silent });
  const knowledge = createKnowledge();
  const sent = [];
  const notifications = {
    async send(target, payload) {
      sent.push({ target, payload });
    },
  };
  const handler = createCallbackHandler({
    responder,
    knowledge,
    notifications,
    config: { adminChatIds },
    logger: silent,
  });

  return { handler, telegram, sent };
}

function context(data, chatId = '1001', channel = 'telegram') {
  return {
    channel,
    chatId,
    replyTo: { channel, chatId },
    callbackQuery: { id: 'cb-1', data },
  };
}

function sentMessages(telegram) {
  return telegram.calls.filter((call) => call.method === 'sendMessage');
}

test('faq:list envía el listado con teclado de FAQs', async () => {
  const { handler, telegram } = makeHandler();

  assert.equal(await handler(context('faq:list')), true);
  assert.match(sentMessages(telegram)[0].payload.text, /Preguntas frecuentes/);
  assert.ok(sentMessages(telegram)[0].payload.reply_markup.inline_keyboard);
});

test('faq:<id> responde la FAQ con texto escapado', async () => {
  const { handler, telegram } = makeHandler();

  assert.equal(await handler(context('faq:confianza')), true);
  const call = sentMessages(telegram)[0];
  assert.match(call.payload.text, /verificación de identidad/i);
  assert.equal(call.payload.parse_mode, 'HTML');
});

test('info:<id> responde el flujo del producto', async () => {
  const { handler, telegram } = makeHandler();

  assert.equal(await handler(context('info:pasos')), true);
  assert.match(sentMessages(telegram)[0].payload.text, /Publicá el trabajo/);
  assert.equal(await handler(context('info:no-existe')), false);
});

test('action:menu vuelve a la bienvenida', async () => {
  const { handler, telegram } = makeHandler();

  assert.equal(await handler(context('action:menu')), true);
  assert.match(sentMessages(telegram)[0].payload.text, /Elegí una opción/);
});

test('action:notify_test solo notifica a administradores', async () => {
  const admin = makeHandler();
  assert.equal(await admin.handler(context('action:notify_test')), true);
  assert.equal(admin.sent.length, 1);
  assert.match(admin.sent[0].payload.title, /Notificación de prueba/);

  const visitor = makeHandler();
  assert.equal(await visitor.handler(context('action:notify_test', '2002')), true);
  assert.equal(visitor.sent.length, 0);
  assert.match(sentMessages(visitor.telegram)[0].payload.text, /Solo administradores/);
});

test('callbacks desconocidos se descartan pero se confirman', async () => {
  const { handler, telegram } = makeHandler();

  assert.equal(await handler(context('action:otro')), false);
  assert.equal(sentMessages(telegram).length, 0);
  assert.ok(telegram.calls.some((call) => call.method === 'answerCallbackQuery'));
});

test('los callbacks de la app móvil no se envían por Telegram', async () => {
  const { handler, telegram } = makeHandler();

  assert.equal(await handler(context('faq:que-es', 'mobile:u-1', 'mobile')), true);
  assert.equal(sentMessages(telegram).length, 0);
});
