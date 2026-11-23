export const CHANNELS = Object.freeze({
  TELEGRAM: 'telegram',
  WEB: 'web',
  MOBILE: 'mobile',
});

export function makeTarget(channel, chatId, extra = {}) {
  return { channel, chatId, ...extra };
}

export function normalizeTarget(target) {
  if (target === null || typeof target !== 'object') {
    return makeTarget(CHANNELS.TELEGRAM, target);
  }

  return {
    channel: target.channel || CHANNELS.TELEGRAM,
    chatId: target.chatId,
    ...target,
  };
}

export function outboxKey(target) {
  const normalized = normalizeTarget(target);
  return `${normalized.channel}:${String(normalized.chatId)}`;
}
