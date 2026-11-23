import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fromMobilePayload,
  fromTelegramUpdate,
  fromWebPayload,
  PayloadValidationError,
} from '../src/adapters/messages.js';

test('adapta un update de Telegram con callback_query', () => {
  const message = fromTelegramUpdate({
    update_id: 1,
    callback_query: {
      id: 'cb-1',
      data: 'faq:que-es',
      from: { id: 10 },
      message: { chat: { id: 20 } },
    },
  });

  assert.equal(message.channel, 'telegram');
  assert.equal(message.chatId, 20);
  assert.equal(message.callbackData, 'faq:que-es');
  assert.equal(message.replyTo.channel, 'telegram');
});

test('convierte startParam web en comando /start', () => {
  const message = fromWebPayload({
    sessionId: 's-1',
    startParam: 'cliente',
  });

  assert.equal(message.text, '/start cliente');
  assert.equal(message.replyTo.chatId, 's-1');
});

test('mobile exige userId', () => {
  assert.throws(() => fromMobilePayload({ text: 'hola' }), PayloadValidationError);
});

test('mobile usa chatId estable por usuario', () => {
  const message = fromMobilePayload({ userId: 77, text: 'hola', role: 'worker' });

  assert.equal(message.chatId, 'mobile:77');
  assert.equal(message.userId, '77');
  assert.equal(message.role, 'worker');
});
