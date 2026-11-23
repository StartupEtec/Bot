import { escapeHtml } from '../utils/telegramText.js';

export function createMessageHandler({ responder, knowledge, logger = console }) {
  return async function handleMessage(ctx) {
    if (!ctx.text || ctx.text.startsWith('/')) return false;

    const entry = knowledge.find(ctx.text);

    if (!entry) {
      logger.debug?.(`Sin respuesta para: ${ctx.text}`);
      await responder.send(ctx.replyTo, [
        '<b>No encontré una respuesta exacta</b>',
        '',
        'Probá con “qué es Laborin”, “cómo funciona”, “cambiar rol”, “OTP”, “Escrow” o usá el menú.',
      ].join('\n'), { replyMarkup: knowledge.makeMainKeyboard() });
      return true;
    }

    await responder.send(
      ctx.replyTo,
      `<b>${escapeHtml(entry.title)}</b>\n\n${escapeHtml(entry.answer)}`,
      { replyMarkup: knowledge.makeMainKeyboard() },
    );

    return true;
  };
}
