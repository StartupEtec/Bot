import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputPath = resolve(root, 'docs/index.html');
const checkOnly = process.env.DOCS_CHECK === '1';

const ENDPOINTS = [
  { method: 'GET', path: '/health', description: 'Healthcheck del gateway.' },
  {
    method: 'POST',
    path: '/telegram/webhook',
    description: 'Updates de Telegram, protegido por x-telegram-bot-api-secret-token.',
  },
  {
    method: 'POST',
    path: '/channels/web',
    description: 'Chat web: {sessionId, text, startParam?} → messages, con x-channel-token.',
  },
  {
    method: 'POST',
    path: '/channels/mobile',
    description: 'Chat móvil: {userId, text, role?, startParam?} → messages, con x-channel-token.',
  },
];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function collect(regex, content, index = 1) {
  return [...content.matchAll(regex)].map((match) => match[index]);
}

function commands() {
  const registered = [
    ...read('src/bot.js').matchAll(
      /\{\s*command:\s*'([^']+)',\s*description:\s*'([^']+)'\s*\}/g,
    ),
  ].map((match) => ({ command: match[1], description: match[2] }));

  const known = new Set(registered.map((item) => item.command));
  const fromHelp = [
    ...read('src/knowledge/answerEngine.js').matchAll(/'\/([a-zA-Z0-9_]+)\s+—\s+([^']+)'/g),
  ].map((match) => ({ command: match[1], description: match[2] }));

  for (const item of fromHelp) {
    if (!known.has(item.command)) {
      registered.push(item);
      known.add(item.command);
    }
  }

  return registered;
}

function variables() {
  let comment = '';
  const rows = [];

  for (const line of read('.env.example').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      comment = trimmed.replace(/^#+\s*/, '');
      continue;
    }

    const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;

    rows.push({ name: match[1], description: comment || 'Variable de configuración.' });
    comment = '';
  }

  return rows;
}

function architecture(readme) {
  return (
    readme.match(/## 2\. Arquitectura multicanal[\s\S]*?```([\s\S]*?)```/)?.[1]?.trim() ?? ''
  );
}

function intro(readme) {
  return readme.split(/^## /m)[0].split('\n').slice(1).join('\n').trim();
}

function table(headers, rows) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('\n');

  return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

const readme = read('README.md');
const faqs = collect(/question:\s*'([^']+)'/g, read('src/knowledge/startup.js'));
const commandRows = commands().map((item) => [`/${item.command}`, item.description]);
const endpointRows = ENDPOINTS.map((item) => [item.method, item.path, item.description]);
const variableRows = variables().map((item) => [item.name, item.description]);
const faqRows = faqs.map((question) => [question]);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bot de Laborin · Documentación</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#111827;max-width:900px;margin:0 auto;padding:2rem 1rem;}
  h1{font-size:2rem;margin-bottom:0.25rem;}
  h2{margin-top:2rem;border-bottom:1px solid #d1d5db;padding-bottom:0.3rem;}
  table{border-collapse:collapse;width:100%;margin:1rem 0;}
  th,td{border:1px solid #d1d5db;padding:0.45rem 0.6rem;text-align:left;vertical-align:top;}
  th{background:#f3f4f6;}
  pre{background:#f3f4f6;padding:1rem;overflow:auto;border-radius:6px;}
  code{font-family:ui-monospace,Menlo,Consolas,monospace;}
  footer{margin-top:3rem;color:#6b7280;font-size:0.85rem;}
</style>
</head>
<body>
<h1>Bot de Laborin · Documentación</h1>
<p>${escapeHtml(intro(readme))}</p>

<h2>Arquitectura</h2>
<pre>${escapeHtml(architecture(readme))}</pre>

<h2>Comandos de Telegram</h2>
${table(['Comando', 'Descripción'], commandRows)}

<h2>Endpoints del gateway</h2>
${table(['Método', 'Ruta', 'Descripción'], endpointRows)}

<h2>Variables de entorno</h2>
<p>Solo se listan los nombres. Los valores reales viven en el <code>.env</code> del servidor y nunca en el repositorio.</p>
${table(['Variable', 'Uso'], variableRows)}

<h2>Preguntas frecuentes que responde el bot</h2>
${table(['Pregunta'], faqRows)}

<footer>Generado automáticamente con <code>npm run docs</code>. No editar a mano.</footer>
</body>
</html>
`;

const previous = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);

if (checkOnly && previous !== html) {
  console.error('docs/index.html está desactualizado: ejecutá npm run docs y commiteá el resultado.');
  process.exitCode = 1;
} else {
  console.log(`Documentación generada: ${outputPath}`);
}
