import { fromTelegramUpdate } from './adapters/messages.js';
import { makeTarget } from './adapters/target.js';
import { ChannelResponder } from './services/channelResponder.js';
import { UserLinkingService } from './services/userLinking.js';
import { createCommandHandlers, parseCommand } from './handlers/commands.js';
import { createMessageHandler } from './handlers/messages.js';
import { createCallbackHandler } from './handlers/callbacks.js';

const BOT_COMMANDS = [
  { command: 'start', description: 'Bienvenida y menú' },
  { command: 'help', description: 'Lista de comandos' },
  { command: 'faq', description: 'Preguntas frecuentes' },
  { command: 'como_funciona', description: 'Pasos del servicio' },
  { command: 'roles', description: 'Cliente y trabajador' },
  { command: 'categorias', description: 'Categorías del backend' },
  { command: 'estado', description: 'Estado del backend' },
  { command: 'contacto', description: 'Canales de atención' },
];

function createContext(message, parsed) {
  return {
    channel: message.channel,
    chatId: message.chatId,
    userId: message.userId,
    role: message.role,
    messageId: message.messageId,
    from: message.from,
    text: message.text,
    args: parsed?.args ?? '',
    replyTo: message.replyTo ?? makeTarget(message.channel, message.chatId),
    callbackQuery: message.callbackData
      ? {
          id: message.callbackId,
          data: message.callbackData,
          message: { chat: { id: message.chatId } },
          from: message.from,
        }
      : undefined,
    raw: message.raw,
  };
}

export function createBot({
  config,
  telegram,
  responder,
  linking,
  knowledge,
  backend,
  notifications,
  logger = console,
}) {
  const runtimeConfig = {
    ...config,
    adminChatIds: config.adminChatIds ?? [],
    allowedChatIds: config.allowedChatIds ?? [],
  };

  const channelResponder = responder ?? new ChannelResponder({ telegram, logger });
  const userLinking = linking ?? new UserLinkingService({
    secret: config.linkingSecret,
    logger,
  });

  const commandHandlers = createCommandHandlers({
    responder: channelResponder,
    knowledge,
    notifications,
    backend,
    linking: userLinking,
    config: runtimeConfig,
    logger,
  });
  const handleText = createMessageHandler({ responder: channelResponder, knowledge, logger });
  const handleCallback = createCallbackHandler({
    responder: channelResponder,
    knowledge,
    notifications,
    config: runtimeConfig,
    logger,
  });

  let running = false;

  function isAllowed(message) {
    if (message.channel !== 'telegram') return true;
    if (!runtimeConfig.allowedChatIds.length) return true;
    return runtimeConfig.allowedChatIds.map(String).includes(String(message.chatId));
  }

  async function handleMessage(message) {
    let replyTo = null;

    try {
      if (!message?.chatId) return false;

      if (!isAllowed(message)) {
        logger.warn?.(`Mensaje de chat no autorizado: ${message.chatId}`);
        return false;
      }

      const parsed = parseCommand(message.text);
      const ctx = createContext(message, parsed);
      replyTo = ctx.replyTo;

      logger.info?.(`Mensaje de ${message.channel} chat_id=${message.chatId}`);

      if (message.callbackData) return await handleCallback(ctx);
      if (!message.text) return false;

      if (parsed && commandHandlers[parsed.name]) {
        return await commandHandlers[parsed.name](ctx);
      }

      return await handleText(ctx);
    } catch (error) {
      logger.error?.(`Error procesando mensaje: ${error.message}`);

      if (replyTo) {
        try {
          await channelResponder.send(
            replyTo,
            'Ocurrió un error al procesar tu mensaje. Probá de nuevo en unos instantes.',
          );
        } catch {
          logger.error?.('No se pudo enviar el mensaje de error al canal.');
        }
      }

      return false;
    }
  }

  async function handleUpdate(update) {
    const message = fromTelegramUpdate(update);
    if (!message) return false;
    return handleMessage(message);
  }

  async function registerCommands() {
    return telegram.setMyCommands(BOT_COMMANDS);
  }

  async function startPolling({ signal } = {}) {
    if (running) return;
    running = true;

    let offset = 0;

    logger.info?.('Iniciando polling de Telegram...');

    while (running && !signal?.aborted) {
      try {
        const updates = await telegram.getUpdates({
          offset,
          timeout: runtimeConfig.pollingTimeout ?? 30,
          signal,
        });

        for (const update of updates || []) {
          await handleUpdate(update);
          offset = Math.max(offset, (update.update_id ?? 0) + 1);
        }

        if (!updates?.length && telegram.dryRun) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        if (signal?.aborted || !running) break;

        logger.error?.(`Error en polling: ${error.message}`);
        await new Promise((resolve) =>
          setTimeout(resolve, runtimeConfig.retryDelayMs ?? 2000),
        );
      }
    }

    running = false;
    logger.info?.('Polling detenido.');
  }

  function stop() {
    running = false;
  }

  return Object.freeze({
    handleMessage,
    handleUpdate,
    registerCommands,
    startPolling,
    stop,
    commands: commandHandlers,
    responder: channelResponder,
    linking: userLinking,
  });
}
