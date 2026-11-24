export class BackendClient {
  constructor({
    baseUrl = '',
    accessToken = '',
    fetchImpl = fetch,
    logger = console,
    timeoutMs = 10000,
  } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.accessToken = String(accessToken || '').trim();
    this.fetchImpl = fetchImpl;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  get enabled() {
    return Boolean(this.baseUrl);
  }

  async request(path, { method = 'GET', body, auth = true, timeoutMs = this.timeoutMs } = {}) {
    if (!this.baseUrl) {
      throw new Error('LABORIN_API_BASE_URL no configurada');
    }

    const headers = { accept: 'application/json' };

    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth && this.accessToken) headers.authorization = `Bearer ${this.accessToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message || data?.error || `Backend respondió HTTP ${response.status}`,
      );
    }

    return data;
  }

  async health() {
    return this.request('/health', { auth: false });
  }

  async categories() {
    return this.request('/categories', { auth: false });
  }

  async sendChatMessage(chatId, content) {
    return this.request(`/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: { message_type: 'TEXT', content },
    });
  }
}
