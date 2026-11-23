import test from 'node:test';
import assert from 'node:assert/strict';

import { UserLinkingService } from '../src/services/userLinking.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

test('verifica un token de deep-link firmado', () => {
  const service = new UserLinkingService({ secret: 'secreto', logger: silent });
  const token = service.createStartToken({ userId: 'u-1', expiresInSeconds: 60 });

  const result = service.verifyStartToken(token);
  assert.equal(result.ok, true);
  assert.equal(result.userId, 'u-1');
});

test('rechaza firmas inválidas', () => {
  const service = new UserLinkingService({ secret: 'secreto', logger: silent });
  assert.equal(service.verifyStartToken('abc.def').reason, 'firma_invalida');
});

test('no vincula sin consentimiento', () => {
  const service = new UserLinkingService({ secret: 'secreto', logger: silent });
  const result = service.link({ channel: 'mobile', chatId: 'mobile:1', userId: 'u-1' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'consentimiento_requerido');
  assert.equal(service.getByUser('u-1'), null);
});

test('desvincula un chat', () => {
  const service = new UserLinkingService({ secret: 'secreto', logger: silent });
  service.link({ channel: 'mobile', chatId: 'mobile:1', userId: 'u-1', consent: true });

  assert.equal(service.unlink({ channel: 'mobile', chatId: 'mobile:1' }), true);
  assert.equal(service.getByChat({ channel: 'mobile', chatId: 'mobile:1' }), null);
});
