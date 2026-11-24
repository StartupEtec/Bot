import { makeTarget, normalizeTarget } from '../adapters/target.js';
import { ChannelResponder } from './channelResponder.js';
import { escapeHtml } from '../utils/telegramText.js';

const LEVEL_ICONS = { info: 'Información', success: 'Éxito', warning: 'Aviso', error: 'Alerta' };

export class NotificationService {
  constructor({
    telegram,
    responder,
    backend,
    linking,
    config,
    logger = console,
  } = {}) {
    this.responder = responder ?? new ChannelResponder({ telegram, logger });
    this.backend = backend;
    this.linking = linking;
    this.config = config;
    this.logger = logger;
  }

  async send(target, { title, message, level = 'info' } = {}) {
    const normalized = normalizeTarget(target);

    if (!normalized.chatId) {
      throw new Error('chatId es obligatorio para notificar');
    }

    const label = LEVEL_ICONS[level] ?? LEVEL_ICONS.info;
    const text = [
      `<b>${escapeHtml(label)}: ${escapeHtml(title || 'Notificación')}</b>`,
      '',
      escapeHtml(message || ''),
    ].join('\n');

    this.logger.info?.(`Notificación [${normalized.channel}] para ${normalized.chatId}: ${title || 'sin título'}`);
    return this.responder.send(normalized, text);
  }

  async notifyAdmins(payload) {
    const ids = this.config?.adminChatIds ?? [];

    if (!ids.length) {
      this.logger.warn?.('No hay TELEGRAM_ADMIN_CHAT_IDS configurados; no se notificó a nadie.');
      return [];
    }

    return Promise.allSettled(ids.map((chatId) => this.send(chatId, payload)));
  }

  async sendToUser({ channel, userId, ...payload }) {
    const link = this.linking?.getByUser(userId, channel);

    if (!link) {
      return { skipped: true, reason: 'user_not_linked' };
    }

    return this.send(makeTarget(link.channel, link.chatId), payload);
  }

  async notifyOrderStatus({ chatId, orderId, status }) {
    return this.send(chatId, {
      title: `Orden ${orderId}`,
      message: `Nuevo estado: ${status}. Seguí el servicio desde la app.`,
      level: 'info',
    });
  }

  async mirrorToBackendChat({ chatId, content }) {
    if (!this.backend?.enabled) {
      return { skipped: true, reason: 'backend_no_configurado' };
    }

    return this.backend.sendChatMessage(chatId, content);
  }
}
