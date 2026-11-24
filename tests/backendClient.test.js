import test from 'node:test';
import assert from 'node:assert/strict';

import { BackendClient } from '../src/services/backendClient.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

test('consulta categorías sin token y con la base /api/v1', async () => {
  const calls = [];
  const backend = new BackendClient({
    baseUrl: 'http://localhost:3000/api/v1/',
    accessToken: '',
    logger: silent,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({ categories: [{ name: 'Plomería' }] }),
      };
    },
  });

  const result = await backend.categories();

  assert.equal(calls[0].url, 'http://localhost:3000/api/v1/categories');
  assert.equal(calls[0].init.headers.authorization, undefined);
  assert.equal(result.categories[0].name, 'Plomería');
});

test('envía mensaje al chat del backend con Bearer token', async () => {
  let captured;
  const backend = new BackendClient({
    baseUrl: 'http://localhost:3000/api/v1',
    accessToken: 'jwt-de-prueba',
    logger: silent,
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true, json: async () => ({ id: 'msg-1' }) };
    },
  });

  await backend.sendChatMessage('chat-uuid', 'Aviso desde Telegram');

  assert.equal(captured.url, 'http://localhost:3000/api/v1/chats/chat-uuid/messages');
  assert.equal(captured.init.headers.authorization, 'Bearer jwt-de-prueba');
  assert.deepEqual(JSON.parse(captured.init.body), {
    message_type: 'TEXT',
    content: 'Aviso desde Telegram',
  });
});

test('sin base configurada el cliente está deshabilitado', () => {
  const backend = new BackendClient({ logger: silent });
  assert.equal(backend.enabled, false);
});
