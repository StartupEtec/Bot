import { escapeHtml } from '../utils/telegramText.js';

export function createCallbackHandler({
  responder,
  knowledge,
  notifications,
  config,
  logger = console,
}) {
  const isAdmin = (ctx) =>
    ctx.channel === 'telegram' &&
    (config.adminChatIds ?? []).map(String).includes(String(ctx.chatId));

  return async function handleCallback(ctx) {
    const data = ctx.callbackQuery.data || '';
    await responder.answerCallback(ctx.replyTo, ctx.callbackQuery.id);

    if (data === 'faq:list') {
      const text = [
        '<b>Preguntas frecuentes</b>',
        '',
        knowledge.faq.map((item) => `• ${item.question}`).join('\n'),
      ].join('\n');

      await responder.send(ctx.replyTo, text, {
        replyMarkup: knowledge.makeFaqKeyboard(),
      });
      return true;
    }

    if (data.startsWith('faq:')) {
      const item = knowledge.getFaq(data.slice(4));
      if (!item) return false;

      await responder.send(
        ctx.replyTo,
        `<b>${escapeHtml(item.question)}</b>\n\n${escapeHtml(item.answer)}`,
        { replyMarkup: knowledge.makeFaqKeyboard() },
      );
      return true;
    }

    if (data.startsWith('info:')) {
      const item = knowledge.getFlow(data.slice(5));
      if (!item) return false;

      await responder.send(
        ctx.replyTo,
        `<b>${escapeHtml(item.title)}</b>\n\n${escapeHtml(item.answer)}`,
        { replyMarkup: knowledge.makeMainKeyboard() },
      );
      return true;
    }

    if (data === 'action:menu') {
      await responder.send(ctx.replyTo, knowledge.welcomeMessage(), {
        replyMarkup: knowledge.makeMainKeyboard(),
      });
      return true;
    }

    if (data === 'action:notify_test') {
      if (!isAdmin(ctx)) {
        await responder.send(ctx.replyTo, 'Solo administradores pueden probar notificaciones.');
        return true;
      }

      await notifications.send(ctx.replyTo, {
        title: 'Notificación de prueba',
        message: 'La integración con Telegram funciona correctamente.',
        level: 'success',
      });
      return true;
    }

    logger.debug?.(`Callback no reconocido: ${data}`);
    return false;
  };
}
