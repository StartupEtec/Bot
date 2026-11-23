import { createHmac, timingSafeEqual } from 'node:crypto';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export class UserLinkingService {
  constructor({ secret = '', logger = console, store = new Map() } = {}) {
    this.secret = String(secret || '');
    this.logger = logger;
    this.store = store;
  }

  get configured() {
    return Boolean(this.secret);
  }

  createStartToken({ userId, channel = 'mobile', expiresInSeconds = 300 } = {}) {
    if (!this.configured) throw new Error('BOT_LINKING_SECRET no configurado');
    if (!userId) throw new Error('userId es obligatorio');

    const payload = encode({
      userId: String(userId),
      channel,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
    const signature = createHmac('sha256', this.secret).update(payload).digest('base64url');

    return `${payload}.${signature}`;
  }

  verifyStartToken(token) {
    if (!this.configured) return { ok: false, reason: 'linking_no_configurado' };

    const parts = String(token || '').split('.');
    if (parts.length !== 2) return { ok: false, reason: 'token_invalido' };

    const [payload, signature] = parts;
    const expected = createHmac('sha256', this.secret).update(payload).digest('base64url');

    let valid = false;
    try {
      valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      valid = false;
    }

    if (!valid) return { ok: false, reason: 'firma_invalida' };

    let data;
    try {
      data = decode(payload);
    } catch {
      return { ok: false, reason: 'payload_invalido' };
    }

    if (!data?.userId || !data?.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: 'token_expirado' };
    }

    return { ok: true, userId: String(data.userId), channel: data.channel };
  }

  link({ channel, chatId, userId, consent = false, metadata = {} }) {
    if (!channel || !chatId || !userId) {
      return { ok: false, reason: 'datos_incompletos' };
    }

    if (!consent) return { ok: false, reason: 'consentimiento_requerido' };

    const key = `${channel}:${String(chatId)}`;
    const existing = this.store.get(key);

    if (existing && existing.userId !== String(userId)) {
      return { ok: false, reason: 'chat_ya_vinculado_a_otro_usuario', record: existing };
    }

    const record = {
      channel,
      chatId: String(chatId),
      userId: String(userId),
      linkedAt: new Date().toISOString(),
      metadata,
    };

    this.store.set(key, record);
    this.logger.info?.(`Usuario ${record.userId} vinculado a ${channel}:${record.chatId}`);

    return { ok: true, record };
  }

  unlink({ channel, chatId }) {
    return this.store.delete(`${channel}:${String(chatId)}`);
  }

  getByChat({ channel, chatId }) {
    return this.store.get(`${channel}:${String(chatId)}`) ?? null;
  }

  getByUser(userId, channel) {
    const target = String(userId);

    for (const record of this.store.values()) {
      if (record.userId === target && (!channel || record.channel === channel)) {
        return record;
      }
    }

    return null;
  }
}
