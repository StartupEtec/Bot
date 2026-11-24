import { escapeHtml } from '../utils/telegramText.js';

const SOURCE_LABELS = {
  landing: 'Landing',
  web: 'Web',
  app: 'App móvil',
  movil: 'App móvil',
  mobile: 'App móvil',
  cliente: 'Modo Cliente',
  client: 'Modo Cliente',
  proveedor: 'Modo Proveedor',
  trabajador: 'Modo Trabajador',
  worker: 'Modo Trabajador',
};

function maskId(value) {
  const id = String(value);
  return id.length <= 4 ? '***' : `${id.slice(0, 2)}…${id.slice(-2)}`;
}

export function parseCommand(text = '') {
  const match = String(text)
    .trim()
    .match(/^\/([a-zA-Z0-9_]+)(?:@[\w_]+)?(?:\s+([\s\S]*))?$/);

  if (!match) return null;

  return { name: match[1].toLowerCase(), args: (match[2] ?? '').trim() };
}

function formatList(items) {
  return items.filter(Boolean).map((item) => `• ${item}`).join('\n');
}

function extractCategories(payload) {
  const source = payload?.categories ?? payload?.data ?? payload;

  if (!Array.isArray(source)) return [];

  return source
    .map((item) => (typeof item === 'string' ? item : item?.name ?? item?.name_es ?? item?.title))
    .filter(Boolean);
}

export function createCommandHandlers({
  responder,
  knowledge,
  notifications,
  backend,
  linking,
  config,
  logger = console,
}) {
  const send = (target, text, options) => responder.send(target, text, options);
  const isAdmin = (ctx) =>
    ctx.channel === 'telegram' &&
    (config.adminChatIds ?? []).map(String).includes(String(ctx.chatId));

  async function start(ctx) {
    const [firstParam] = String(ctx.args ?? '').split(/\s+/).filter(Boolean);
    let sourceLabel = firstParam ? SOURCE_LABELS[firstParam.toLowerCase()] : undefined;
    let linkedNote = '';

    if (firstParam?.includes('.')) {
      const verified = linking?.verifyStartToken(firstParam);

      if (verified?.ok) {
        const result = linking.link({
          channel: ctx.channel,
          chatId: ctx.chatId,
          userId: verified.userId,
          consent: true,
          metadata: { source: verified.channel || ctx.channel },
        });

        linkedNote = result.ok
          ? `Cuenta vinculada (${maskId(verified.userId)}).`
          : 'Ese chat ya está vinculado a otra cuenta.';
        sourceLabel = sourceLabel || (ctx.channel === 'mobile' ? 'App móvil' : 'Web');
      } else {
        linkedNote = 'El enlace de vinculación venció o no es válido.';
      }
    }

    return send(ctx.replyTo, knowledge.welcomeMessage(sourceLabel, linkedNote), {
      replyMarkup: knowledge.makeMainKeyboard(),
    });
  }

  async function help(ctx) {
    return send(ctx.replyTo, knowledge.helpMessage());
  }

  async function quees(ctx) {
    const entry = knowledge.getFlow('que-es');
    return send(ctx.replyTo, `<b>${escapeHtml(entry.title)}</b>\n\n${escapeHtml(entry.answer)}`, {
      replyMarkup: knowledge.makeMainKeyboard(),
    });
  }

  async function comoFunciona(ctx) {
    const entry = knowledge.getFlow('pasos');
    return send(ctx.replyTo, `<b>${escapeHtml(entry.title)}</b>\n\n${escapeHtml(entry.answer)}`, {
      replyMarkup: knowledge.makeMainKeyboard(),
    });
  }

  async function roles(ctx) {
    const text = [
      '<b>Una cuenta, dos puntos de vista</b>',
      '',
      escapeHtml(knowledge.flows.find((item) => item.id === 'cliente')?.answer ?? ''),
      '',
      escapeHtml(knowledge.flows.find((item) => item.id === 'trabajador')?.answer ?? ''),
      '',
      'Podés cambiar de rol desde Mi Perfil → Cambiar Rol.',
    ].join('\n');

    return send(ctx.replyTo, text, { replyMarkup: knowledge.makeMainKeyboard() });
  }

  async function faq(ctx) {
    const text = [
      '<b>Preguntas frecuentes</b>',
      '',
      formatList(knowledge.faq.map((item) => item.question)),
    ].join('\n');

    return send(ctx.replyTo, text, { replyMarkup: knowledge.makeFaqKeyboard() });
  }

  async function app(ctx) {
    const text = [
      '<b>Usá Laborin</b>',
      '',
      `App (iOS, Android y web): ${knowledge.appUrl}`,
      `Landing informativa: ${knowledge.landingUrl}`,
    ].join('\n');

    return send(ctx.replyTo, text, {
      replyMarkup: knowledge.makeMainKeyboard(),
    });
  }

  async function contacto(ctx) {
    const entry = knowledge.getFlow('contacto');
    return send(ctx.replyTo, `<b>${escapeHtml(entry.title)}</b>\n\n${escapeHtml(entry.answer)}`);
  }

  async function categorias(ctx) {
    if (!backend?.enabled) {
      return send(ctx.replyTo, knowledge.backendInfoMessage());
    }

    try {
      const payload = await backend.categories();
      const names = extractCategories(payload);
      const text = names.length
        ? ['<b>Categorías disponibles</b>', '', formatList(names)].join('\n')
        : [
            '<b>Categorías de servicio</b>',
            '',
            'La API respondió correctamente pero no se encontraron categorías para mostrar.',
          ].join('\n');

      return send(ctx.replyTo, text, { replyMarkup: knowledge.makeMainKeyboard() });
    } catch (error) {
      logger.warn?.(`No se pudieron consultar categorías: ${error.message}`);
      return send(ctx.replyTo, knowledge.backendInfoMessage());
    }
  }

  async function estado(ctx) {
    if (!backend?.enabled) {
      return send(ctx.replyTo, knowledge.backendInfoMessage());
    }

    try {
      const health = await backend.health();
      const status = health?.status ?? health?.data?.status ?? 'ok';

      return send(ctx.replyTo, [
        '<b>Estado del backend</b>',
        '',
        `Base: ${knowledge.apiBaseUrl}`,
        `Respuesta: ${escapeHtml(status)}`,
      ].join('\n'));
    } catch (error) {
      logger.warn?.(`Health check falló: ${error.message}`);
      return send(ctx.replyTo, [
        '<b>Estado del backend</b>',
        '',
        'No se pudo consultar el servicio. Revisá LABORIN_API_BASE_URL y la conectividad.',
      ].join('\n'));
    }
  }

  async function notificar(ctx) {
    if (!isAdmin(ctx)) {
      return send(ctx.replyTo, 'Ese comando está disponible solo para administradores del bot.');
    }

    const targets = ctx.args
      ? ctx.args.split(/\s+/).filter(Boolean)
      : config.adminChatIds ?? [];

    if (!targets.length) {
      return send(ctx.replyTo, 'No hay chat de destino. Usá /notificar <chat_id> [mensaje].');
    }

    const [firstTarget, ...rest] = targets;
    const looksLikeChatId = /^-?\d+$/.test(firstTarget);
    const target = looksLikeChatId ? firstTarget : ctx.replyTo;
    const message = looksLikeChatId
      ? rest.join(' ') || 'Esta es una notificación de prueba del bot de Laborin.'
      : targets.join(' ');

    await notifications.send(target, {
      title: 'Prueba de notificación',
      message,
      level: 'success',
    });

    const label = looksLikeChatId ? `chat ${firstTarget}` : 'los administradores';
    return send(ctx.replyTo, `Notificación enviada a ${label}.`);
  }

  return {
    start,
    help,
    quees,
    como_funciona: comoFunciona,
    roles,
    faq,
    app,
    contacto,
    categorias,
    estado,
    notificar,
  };
}
