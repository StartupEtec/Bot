export class TelegramApiError extends Error {
  constructor(method, status, payload, message) {
    super(message || `Telegram ${method} falló con HTTP ${status}`);
    this.name = 'TelegramApiError';
    this.method = method;
    this.status = status;
    this.payload = payload;
  }
}

export class TelegramClient {
  constructor({
    token,
    apiBase = 'https://api.telegram.org',
    dryRun = false,
    fetchImpl = fetch,
    logger = console,
  } = {}) {
    this.token = token || '';
    this.apiBase = String(apiBase).replace(/\/+$/, '');
    this.dryRun = dryRun;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
    this.calls = [];
    this.sequence = 0;
  }

  get baseUrl() {
    return `${this.apiBase}/bot${this.token}`;
  }

  async call(method, payload = {}, options = {}) {
    this.calls.push({ method, payload });

    if (this.dryRun) {
      this.logger.info?.(`[dry-run] telegram.${method}`);

      if (method === 'getUpdates') return [];

      this.sequence += 1;
      return { ok: true, result: { message_id: this.sequence, ...payload } };
    }

    if (!this.token) {
      throw new Error('TELEGRAM_BOT_TOKEN no configurado');
    }

    const response = await this.fetchImpl(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.ok === false) {
      throw new TelegramApiError(
        method,
        response.status,
        data,
        data?.description || `Telegram ${method} respondió HTTP ${response.status}`,
      );
    }

    return data.result;
  }

  async getUpdates({ offset = 0, timeout = 30, signal } = {}) {
    return this.call(
      'getUpdates',
      {
        offset,
        timeout,
        allowed_updates: ['message', 'callback_query'],
      },
      { signal },
    );
  }

  async sendMessage(chatId, text, options = {}) {
    const {
      parseMode = 'HTML',
      replyMarkup,
      disableWebPagePreview = true,
      ...rest
    } = options;

    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      ...rest,
    });
  }

  async answerCallbackQuery(callbackQueryId, options = {}) {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...options,
    });
  }

  async setMyCommands(commands) {
    return this.call('setMyCommands', { commands });
  }

  async setWebhook({ url, secretToken } = {}) {
    return this.call('setWebhook', {
      url,
      ...(secretToken ? { secret_token: secretToken } : {}),
      allowed_updates: ['message', 'callback_query'],
    });
  }
}
