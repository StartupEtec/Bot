import test from 'node:test';
import assert from 'node:assert/strict';

import { NotificationService } from '../src/services/notifications.js';
import { TelegramClient } from '../src/services/telegram.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

test('envía notificación formateada a un chat', async () => {
  const telegram = new TelegramClient({ token: 'test', dryRun: true, logger: silent });
  const service = new NotificationService({
    telegram,
    config: { adminChatIds: [] },
    logger: silent,
  });

  await service.send(4242, {
    title: 'Orden #10',
    message: 'Nuevo estado: ESCROWED',
    level: 'success',
  });

  const call = telegram.calls.at(-1);
  assert.equal(call.method, 'sendMessage');
  assert.equal(call.payload.chat_id, 4242);
  assert.match(call.payload.text, /Éxito/);
  assert.match(call.payload.text, /ESCROWED/);
});

test('notifica a todos los administradores configurados', async () => {
  const telegram = new TelegramClient({ token: 'test', dryRun: true, logger: silent });
  const service = new NotificationService({
    telegram,
    config: { adminChatIds: ['1', '2'] },
    logger: silent,
  });

  const results = await service.notifyAdmins({ title: 'Alerta', message: 'Revisar casos' });
  assert.equal(results.length, 2);
  assert.deepEqual(
    telegram.calls.map((call) => call.payload.chat_id),
    ['1', '2'],
  );
});
