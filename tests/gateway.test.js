import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import { startGatewayServer } from '../src/index.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

const settings = {
  port: 0,
  webhookPath: '/telegram/webhook',
  webChannelPath: '/channels/web',
  mobileChannelPath: '/channels/mobile',
  channelAuthToken: 'channel-token',
  webhookSecret: 'webhook-secret',
};

async function withServer(fn, overrides = {}) {
  const messages = [];
  const updates = [];
  const bot = {
    async handleMessage(message) {
      messages.push(message);
    },
    async handleUpdate(update) {
      updates.push(update);
    },
  };
  const responder = { drain: () => [{ text: 'respuesta de prueba' }] };
  const server = startGatewayServer({
    bot,
    responder,
    logger: silent,
    settings: { ...settings, ...overrides },
  });

  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    return await fn({ base, messages, updates });
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeIdleConnections?.();
    });
  }
}

function post(base, path, body, headers = {}) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

test('GET /health responde sin autenticación', async () => {
  await withServer(async ({ base }) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: 'laborin-bot' });
  });
});

test('POST /channels/web exige token y devuelve la respuesta del outbox', async () => {
  await withServer(async ({ base, messages }) => {
    const body = JSON.stringify({ sessionId: 'web-1', text: '¿Qué es Laborin?' });

    const unauthorized = await post(base, '/channels/web', body);
    assert.equal(unauthorized.status, 401);
    assert.equal(messages.length, 0);

    const response = await post(base, '/channels/web', body, {
      'x-channel-token': 'channel-token',
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      channel: 'web',
      count: 1,
      messages: ['respuesta de prueba'],
    });
    assert.equal(messages[0].channel, 'web');
    assert.equal(messages[0].chatId, 'web-1');
  });
});

test('POST /channels/mobile usa userId como chat estable', async () => {
  await withServer(async ({ base, messages }) => {
    const response = await post(
      base,
      '/channels/mobile',
      JSON.stringify({ userId: 'u-7', text: 'hola', role: 'client' }),
      { 'x-channel-token': 'channel-token' },
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).channel, 'mobile');
    assert.equal(messages[0].chatId, 'mobile:u-7');
    assert.equal(messages[0].role, 'client');
  });
});

test('POST /telegram/webhook valida el secreto y entrega el update', async () => {
  await withServer(async ({ base, updates }) => {
    const body = JSON.stringify({
      update_id: 5,
      message: { message_id: 1, chat: { id: 42 }, text: '/start' },
    });

    const unauthorized = await post(base, '/telegram/webhook', body);
    assert.equal(unauthorized.status, 401);

    const response = await post(base, '/telegram/webhook', body, {
      'x-telegram-bot-api-secret-token': 'webhook-secret',
    });
    assert.equal(response.status, 200);
    assert.equal(updates[0].update_id, 5);
  });
});

test('payloads inválidos devuelven 400 y rutas desconocidas 404', async () => {
  await withServer(async ({ base }) => {
    const headers = { 'x-channel-token': 'channel-token' };

    const sinTexto = await post(base, '/channels/web', '{}', headers);
    assert.equal(sinTexto.status, 400);

    const jsonMalformed = await post(base, '/channels/web', '{', headers);
    assert.equal(jsonMalformed.status, 400);

    const sinUsuario = await post(base, '/channels/mobile', '{"text":"hola"}', headers);
    assert.equal(sinUsuario.status, 400);

    const missing = await post(base, '/otro', '{}', headers);
    assert.equal(missing.status, 404);
  });
});

test('las rutas se toman de la configuración inyectada', async () => {
  await withServer(
    async ({ base }) => {
      const response = await post(base, '/web-custom', '{"sessionId":"w","text":"hola"}', {
        'x-channel-token': 'channel-token',
      });
      assert.equal(response.status, 200);
    },
    { webChannelPath: '/web-custom' },
  );
});
