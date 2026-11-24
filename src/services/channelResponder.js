import { normalizeTarget, outboxKey } from '../adapters/target.js';

export class ChannelResponder {
  constructor({ telegram, logger = console } = {}) {
    this.telegram = telegram;
    this.logger = logger;
    this.outbox = new Map();
    this.sequence = 0;
  }

  async send(target, text, options = {}) {
    const normalized = normalizeTarget(target);

    if (normalized.channel === 'telegram') {
      return this.telegram.sendMessage(normalized.chatId, text, options);
    }

    this.sequence += 1;
    const record = {
      id: this.sequence,
      channel: normalized.channel,
      chatId: normalized.chatId,
      text,
      options,
      createdAt: new Date().toISOString(),
    };

    const key = outboxKey(normalized);
    this.outbox.set(key, [...(this.outbox.get(key) ?? []), record]);
    this.logger.info?.(`[${normalized.channel}] respuesta para ${normalized.chatId}`);

    return { ok: true, result: record };
  }

  async answerCallback(target, callbackId, options = {}) {
    const normalized = normalizeTarget(target);

    if (normalized.channel === 'telegram') {
      return this.telegram.answerCallbackQuery(callbackId, options);
    }

    return { ok: true, result: { acknowledged: callbackId, ...options } };
  }

  drain(channel, chatId) {
    const key = outboxKey({ channel, chatId });
    const records = this.outbox.get(key) ?? [];
    this.outbox.delete(key);
    return records;
  }

  drainChat(chatId) {
    const records = [];

    for (const [key, items] of this.outbox.entries()) {
      if (key.endsWith(`:${String(chatId)}`)) {
        records.push(...items);
        this.outbox.delete(key);
      }
    }

    return records;
  }
}
