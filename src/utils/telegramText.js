const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function inlineKeyboard(rows) {
  return { inline_keyboard: rows };
}

export function callbackButton(text, data) {
  return { text, callback_data: data };
}

export function urlButton(text, url) {
  return { text, url };
}
