import { CHANNELS, makeTarget } from './target.js';

export class PayloadValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PayloadValidationError';
  }
}

function requireText(text, startParam) {
  const value = String(text ?? (startParam ? `/start ${startParam}` : '')).trim();

  if (!value) {
    throw new PayloadValidationError('El campo text es obligatorio');
  }

  return value;
}

export function fromTelegramUpdate(update) {
  const callback = update?.callback_query;

  if (callback?.data) {
    const chatId = callback.message?.chat?.id ?? callback.from?.id;
    if (!chatId) return null;

    return {
      channel: CHANNELS.TELEGRAM,
      chatId,
      text: null,
      callbackData: callback.data,
      callbackId: callback.id,
      from: callback.from,
      replyTo: makeTarget(CHANNELS.TELEGRAM, chatId),
      raw: update,
    };
  }

  const message = update?.message;
  if (!message?.text) return null;

  const chatId = message.chat?.id;
  if (!chatId) return null;

  return {
    channel: CHANNELS.TELEGRAM,
    chatId,
    text: message.text,
    messageId: message.message_id,
    from: message.from,
    replyTo: makeTarget(CHANNELS.TELEGRAM, chatId),
    raw: update,
  };
}

export function fromWebPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new PayloadValidationError('El payload debe ser un objeto');
  }

  const text = requireText(payload.text, payload.startParam);
  const chatId = payload.chatId || payload.sessionId || `web:${payload.userId || 'anon'}`;

  return {
    channel: CHANNELS.WEB,
    chatId,
    text,
    userId: payload.userId ? String(payload.userId) : undefined,
    startParam: payload.startParam ? String(payload.startParam) : undefined,
    replyTo: makeTarget(CHANNELS.WEB, chatId),
    raw: payload,
  };
}

export function fromMobilePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new PayloadValidationError('El payload debe ser un objeto');
  }

  if (!payload.userId) {
    throw new PayloadValidationError('El campo userId es obligatorio');
  }

  const text = requireText(payload.text, payload.startParam);
  const userId = String(payload.userId);
  const chatId = `mobile:${userId}`;

  return {
    channel: CHANNELS.MOBILE,
    chatId,
    text,
    userId,
    role: payload.role ? String(payload.role) : undefined,
    startParam: payload.startParam ? String(payload.startParam) : undefined,
    replyTo: makeTarget(CHANNELS.MOBILE, chatId, { userId }),
    raw: payload,
  };
}
