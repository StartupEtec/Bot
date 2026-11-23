import { startup } from './startup.js';
import { callbackButton, inlineKeyboard, urlButton } from '../utils/telegramText.js';

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()¿“"—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEntries() {
  const faqEntries = startup.faq.map((item) => ({
    kind: 'faq',
    id: item.id,
    title: item.question,
    answer: item.answer,
    keywords: item.keywords,
  }));

  const flowEntries = startup.flows.map((item) => ({
    kind: 'flow',
    id: item.id,
    title: item.title,
    answer: item.answer,
    keywords: item.keywords,
  }));

  return [...faqEntries, ...flowEntries];
}

function scoreEntry(entry, tokens, normalizedInput) {
  const haystack = normalizeText(
    [entry.title, entry.keywords.join(' '), entry.answer].join(' '),
  );

  let score = 0;

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (!haystack.includes(token)) continue;
    score += token.length >= 5 ? 2 : 1;
  }

  const normalizedTitle = normalizeText(entry.title);
  if (normalizedTitle && normalizedInput.includes(normalizedTitle)) score += 10;

  return score;
}

export function createKnowledge(options = {}) {
  const appUrl = options.appUrl || startup.appUrl;
  const landingUrl = options.landingUrl || startup.landingUrl;
  const apiBaseUrl = options.apiBaseUrl || '';

  const entries = buildEntries();

  function find(text) {
    const normalizedInput = normalizeText(text);
    const tokens = normalizedInput.split(' ').filter(Boolean);

    if (!tokens.length) return null;

    const ranked = entries
      .map((entry) => ({ entry, score: scoreEntry(entry, tokens, normalizedInput) }))
      .filter((item) => item.score >= 2)
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.entry ?? null;
  }

  function makeMainKeyboard() {
    return inlineKeyboard([
      [callbackButton('Qué es Laborin', 'info:que-es'), callbackButton('Cómo funciona', 'info:pasos')],
      [callbackButton('Roles', 'info:cambiar-rol'), callbackButton('Preguntas frecuentes', 'faq:list')],
      [urlButton('Abrir la app', appUrl)],
    ]);
  }

  function makeFaqKeyboard() {
    const rows = [];

    for (let index = 0; index < startup.faq.length; index += 2) {
      rows.push(
        startup.faq.slice(index, index + 2).map((item) =>
          callbackButton(item.question.replace(/[¿?]/g, ''), `faq:${item.id}`),
        ),
      );
    }

    rows.push([callbackButton('Volver al menú', 'action:menu')]);

    return inlineKeyboard(rows);
  }

  function getFaq(id) {
    return startup.faq.find((item) => item.id === id) ?? null;
  }

  function getFlow(id) {
    const special = {
      'que-es': {
        title: 'Qué es Laborin',
        answer: startup.description,
      },
    };

    return special[id] ?? startup.flows.find((item) => item.id === id) ?? null;
  }

  function welcomeMessage(sourceLabel, linkedNote) {
    return [
      `<b>${startup.name} · Atención</b>`,
      '',
      sourceLabel ? `Origen: ${sourceLabel}` : startup.tagline,
      '',
      startup.description,
      '',
      '<b>Cómo funciona</b>',
      ...startup.steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      `App: ${appUrl}`,
      '',
      ...(linkedNote ? [linkedNote, ''] : []),
      'Elegí una opción o escribí tu pregunta.',
    ].join('\n');
  }

  function helpMessage() {
    return [
      '<b>Comandos disponibles</b>',
      '',
      '/start — bienvenida y menú',
      '/help — esta ayuda',
      '/quees — qué es Laborin',
      '/como_funciona — pasos del servicio',
      '/roles — cliente y trabajador',
      '/faq — preguntas frecuentes',
      '/app — link de la app',
      '/categorias — categorías de servicio',
      '/estado — estado del backend',
      '/contacto — canales de atención',
      '/notificar — prueba de notificación (admin)',
    ].join('\n');
  }

  function backendInfoMessage() {
    if (!apiBaseUrl) {
      return [
        '<b>Categorías de servicio</b>',
        '',
        'Laborin organiza los servicios por categorías en lugar de limitarse a un rubro.',
        '',
        'Para consultar el listado real, configurá LABORIN_API_BASE_URL y LABORIN_API_ACCESS_TOKEN en el .env del bot.',
        'Endpoint: GET /api/v1/categories',
      ].join('\n');
    }

    return [
      '<b>Categorías de servicio</b>',
      '',
      'Consultá el listado actual con /categorias.',
      `Base configurada: ${apiBaseUrl}`,
    ].join('\n');
  }

  return Object.freeze({
    name: startup.name,
    appUrl,
    landingUrl,
    apiBaseUrl,
    faq: startup.faq,
    flows: startup.flows,
    trust: startup.trust,
    find,
    getFaq,
    getFlow,
    makeMainKeyboard,
    makeFaqKeyboard,
    welcomeMessage,
    helpMessage,
    backendInfoMessage,
  });
}
