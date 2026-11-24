# Bot de Atención de Laborin (Telegram + hub multicanal)

Chatbot de atención para **Laborin** con integración directa a la **Telegram Bot API** y un gateway HTTP para canales **web** y **móvil**. Vive íntegramente en esta carpeta (`/home/julian/Startup/Bot`): no modifica la landing, el backend ni el frontend.

No usa dependencias de terceros: Node.js 18+ con `fetch` nativo y `node:test`.

---

## 1. Contexto recopilado del startup (solo lectura)

| Fuente | Qué se tomó | Dónde se usa en el bot |
| --- | --- | --- |
| `Landing/PRODUCT.md`, `Landing/components/Hero.js`, `HowItWorks.js`, `Roles.js`, `Trust.js` | Producto on-demand, 3 pasos (publicar → comparar → pagar), rol dual, verificación de identidad/ubicación, pago protegido, CTA `https://app.laborin.app/` | `src/knowledge/startup.js` (`description`, `steps`, `trust`, `roles`) |
| `Landing/components/Faq.js` | Las 6 FAQs textuales: qué es, para quién, problema, confianza, rubro y dónde vive | `src/knowledge/startup.js` (`faq`) y teclados de `faq:list` |
| `Frontend/src/screens/RegisterScreen.tsx`, `OtpVerificationScreen.tsx`, `CompleteProfileScreen.tsx`, `ProfileScreen.tsx`, `ForgotPasswordScreen.tsx` | Flujos reales de registro, OTP de 6 dígitos, perfil con DNI/selfie, cambio de rol y recuperación de contraseña | `src/knowledge/startup.js` (`flows`) |
| `Frontend/src/components/register/TermsModal.tsx` | Definición legal de Rol Dual y Escrow; privacidad | Respuestas `escrow`, `cambiar-rol` |
| `Backend/src/app.js`, `Backend/docs/openapi.yaml`, `Backend/docs/NOTIFICATION_SYSTEM.md` | API REST en `:3000/api/v1`, JWT + OTP, `/health`, `/categories`, chats, notificaciones, WebSocket `/ws` | `src/services/backendClient.js`, `src/services/notifications.js`, sección 8 |

La landing **no tiene formularios ni datos de contacto** y el frontend **no tiene sección de soporte**. Por eso el bot responde con conocimiento del producto y deriva los casos sensibles a los administradores configurados (`TELEGRAM_ADMIN_CHAT_IDS`).

Tono: español rioplatense, sin métricas ni testimonios inventados.

---

## 2. Arquitectura multicanal

```
Telegram ──► fromTelegramUpdate ─┐
Landing  ──► fromWebPayload ─────┼──► bot.handleMessage ──► commands / messages / callbacks
App      ──► fromMobilePayload ──┘                         │
                                                          ├──► knowledge/answerEngine (respuesta única)
                                                          ├──► backendClient (datos opcionales)
                                                          └──► ChannelResponder ──► Telegram | outbox web | outbox móvil
```

- **Adapters** (`src/adapters/messages.js`): convierten cada payload a un mensaje canónico (`channel`, `chatId`, `text`, `replyTo`, ...).
- **ChannelResponder** (`src/services/channelResponder.js`): para Telegram delega en `sendMessage`; para web/móvil guarda la respuesta en un outbox que el gateway devuelve en la misma petición. En producción se puede reemplazar por una cola, DB o push provider sin tocar los handlers.
- **UserLinkingService** (`src/services/userLinking.js`): firma/verifica tokens de deep-link y vincula `chat_id ↔ user_id` con consentimiento.
- **NotificationService** (`src/services/notifications.js`): notifica a un target de cualquier canal, a administradores de Telegram o a un usuario vinculado.

El despacho (`bot.handleMessage`) es independiente del transporte: agregar un canal nuevo significa escribir un adapter, no reescribir respuestas.

---

## 3. Estructura

```
Bot/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── scripts/check.mjs
├── src/
│   ├── index.js                  # entry point: polling/webhook + gateway HTTP
│   ├── bot.js                    # dispatcher multicanal y loop de polling
│   ├── demo.js                   # simulación de los 3 canales sin token
│   ├── config.js
│   ├── logger.js
│   ├── adapters/
│   │   ├── messages.js           # Telegram / web / móvil → mensaje canónico
│   │   └── target.js             # targets y normalización de canales
│   ├── knowledge/
│   │   ├── startup.js            # base de conocimiento extraída
│   │   └── answerEngine.js       # intents, teclados y textos
│   ├── services/
│   │   ├── telegram.js           # Telegram Bot API
│   │   ├── channelResponder.js   # salida por canal + outbox
│   │   ├── userLinking.js        # deep-link firmado y vinculación
│   │   ├── backendClient.js      # consultas opcionales al API de Laborin
│   │   └── notifications.js      # notificaciones multicanal
│   ├── handlers/
│   │   ├── commands.js           # /start con args, /help, /faq, /notificar, ...
│   │   ├── messages.js
│   │   └── callbacks.js
│   └── utils/telegramText.js
└── tests/                        # 25 pruebas
```

---

## 4. Instalación y configuración

```bash
cd /home/julian/Startup/Bot
npm install
cp .env.example .env
```

Variables nuevas / relevantes:

| Variable | Default | Uso |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | placeholder | Token real de @BotFather |
| `TELEGRAM_ALLOWED_CHAT_IDS` | vacío | Si se llena, solo esos chats de Telegram son atendidos |
| `BOT_DRY_RUN` | `false` | Simula Telegram sin token |
| `TELEGRAM_WEBHOOK_URL` | vacío | Si se define, usa webhook en vez de polling |
| `TELEGRAM_WEBHOOK_PATH` | `/telegram/webhook` | Ruta para updates de Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | vacío | Cabecera `x-telegram-bot-api-secret-token` |
| `WEB_CHANNEL_PATH` | `/channels/web` | Endpoint del canal web |
| `MOBILE_CHANNEL_PATH` | `/channels/mobile` | Endpoint del canal móvil |
| `CHANNEL_AUTH_TOKEN` | placeholder | Cabecera `x-channel-token` para los endpoints de canal |
| `BOT_LINKING_SECRET` | placeholder | Firma HMAC de deep-links `chat ↔ user` |
| `LABORIN_API_BASE_URL` | `http://localhost:3000/api/v1` | Base del backend |
| `LABORIN_API_ACCESS_TOKEN` | vacío | JWT opcional para endpoints privados |
| `PORT` | `3001` | Gateway HTTP |

El bot imprime `Mensaje recibido de chat_id=...` en consola para que puedas copiar el chat ID sin usar `getUpdates`.

---

## 5. Ejecución

```bash
npm start        # polling de Telegram + gateway HTTP en :3001
npm run demo     # simula Telegram, web y móvil; imprime las 3 salidas
npm test         # 25 pruebas
npm run lint     # sintaxis de src/, tests/ y scripts/
npm run check    # lint + tests
```

`npm start` siempre levanta el gateway HTTP. Si `TELEGRAM_WEBHOOK_URL` está vacío, además hace polling. Si está configurado, llama a `setWebhook` y deja el servidor esperando updates.

`Ctrl+C` corta polling y cierra el servidor limpiamente.

---

## 6. Comandos y flujos

| Comando | Respuesta |
| --- | --- |
| `/start` | Bienvenida, 3 pasos, link a la app y menú inline |
| `/start landing`, `/start cliente`, `/start proveedor` | Bienvenida con etiqueta de origen |
| `/start <token_firmado>` | Verifica el token y vincula el chat con el `userId` |
| `/help`, `/faq`, `/quees`, `/como_funciona`, `/roles`, `/app`, `/contacto` | Respuestas desde la base de conocimiento |
| `/categorias`, `/estado` | Consultas opcionales al backend |
| `/notificar [chat_id] [mensaje]` | Prueba de notificación; solo admin de Telegram |

Mensajes libres usan `knowledge.find()` (normaliza acentos y busca FAQs/flujos). Botones inline usan `faq:<id>`, `info:<id>` y `action:menu`.

---

## 7. Integración desde la landing y la app móvil

### Landing (actualmente estática, `output: 'export'`)

1. CTA simple: `https://t.me/<username_del_bot>` en `Hero.js`, `CallToAction.js`, `Navbar.js` o `Footer.js`.
2. Deep links con origen: `https://t.me/<bot>?start=landing`, `?start=cliente`, `?start=proveedor`. El bot ya lee `ctx.args` y muestra `Origen: ...`.
3. Chat embebido real: un serverless llama a `POST /channels/web` con `{sessionId, text}` y pinta `messages`. **Nunca** exponer el token en el cliente.

### App móvil (Expo)

1. Botón de ayuda con `Linking.openURL('https://t.me/<bot>?start=app_cliente')`.
2. Deep link firmado: el backend (o el bot) genera `UserLinkingService.createStartToken({ userId })`; la app abre `https://t.me/<bot>?start=<token>`. El bot verifica la firma, guarda `mobile:<userId>` y lo asocia al usuario.
3. Conversación dentro de la app: `POST /channels/mobile` con `{userId, text, role?}`; la respuesta viene en `messages`.
4. Notificaciones inversas: `NotificationService.sendToUser({ channel: 'mobile', userId, title, message })` usa la vinculación. Para push real, el backend ya expone `/api/v1/notifications/devices` y eventos WS.

**Ejemplos:**

```bash
curl -X POST http://localhost:3001/channels/web \
  -H 'content-type: application/json' \
  -H "x-channel-token: $CHANNEL_AUTH_TOKEN" \
  -d '{"sessionId":"web-1","text":"¿Qué es Laborin?"}'

curl -X POST http://localhost:3001/channels/mobile \
  -H 'content-type: application/json' \
  -H "x-channel-token: $CHANNEL_AUTH_TOKEN" \
  -d '{"userId":"user-123","text":"¿Cómo cambio de rol?","role":"client"}'
```

Respuesta:

```json
{ "ok": true, "channel": "web", "count": 1, "messages": ["<b>¿Qué es Laborin?</b>..."] }
```

---

## 8. Notificaciones

```js
await notifications.send({ channel: 'telegram', chatId: 8323189077 }, {
  title: 'Orden #123',
  message: 'El profesional confirmó el trabajo.',
  level: 'success',
});

await notifications.notifyAdmins({ title: 'Alerta', message: 'Revisar disputa' });
await notifications.notifyOrderStatus({ chatId: 8323189077, orderId: '123', status: 'ESCROWED' });
await notifications.sendToUser({ channel: 'mobile', userId: 'user-123', title: 'Aviso', message: '...' });
```

En Telegram, `/notificar` hace lo mismo con un chat ID o con los administradores configurados.

---

## 9. Conexión con el backend sin tocar su código

- Base: `LABORIN_API_BASE_URL=http://<host>:3000/api/v1`. CORS no bloquea clientes sin header `Origin`.
- Auth: `POST /api/v1/auth/login` → OTP → `POST /api/v1/auth/verify-otp` → `accessToken` (1 h), refrescar con `/auth/refresh-token`. Para el bot se prevé `LABORIN_API_ACCESS_TOKEN`.
- Implementadas: `GET /health` y `GET /categories` (públicas).
- Espejo opcional: `NotificationService.mirrorToBackendChat({ chatId, content })` → `POST /api/v1/chats/{chat_id}/messages` con `{ message_type: 'TEXT', content }`. Requiere JWT y un `chat_id` interno UUID del backend, no el de Telegram.
- Bridge futuro: `ws://<host>/ws?token=...` con eventos `order:status_changed`, `message:new`, `dispute:created`, etc. → `notifyOrderStatus()` o `sendToUser()`.

---

## 10. Seguridad y datos pendientes

- El token de Telegram solo vive en `.env` del servidor; nunca en landing, app ni frontend.
- `CHANNEL_AUTH_TOKEN` protege los endpoints HTTP; `BOT_LINKING_SECRET` firma los deep-links.
- No enviar DNI, fotos ni datos personales por Telegram sin consentimiento y política de privacidad.
- Si el token se compartió por chat, revocarlo con `/revoke` en BotFather.

**Placeholders:** token real, IDs de admin, URL/JWT del backend, `CHANNEL_AUTH_TOKEN`, `BOT_LINKING_SECRET` y, si aplica, `TELEGRAM_WEBHOOK_URL` HTTPS con su secreto.

Con `BOT_DRY_RUN=true` y `npm run demo` se puede validar todo sin credenciales reales.

---

## 11. Docker

```bash
cd /home/julian/Startup/Bot
cp .env.example .env
docker compose up -d --build
docker compose logs -f bot
docker compose ps
```

El gateway queda en `http://localhost:3001` (o el `PORT` configurado) y responde `GET /health`. El `.env` se inyecta como variables de entorno: **no** se copia dentro de la imagen (`.dockerignore`).

Si el backend corre en el host (compose de `Backend`), cambiá en `.env`:

```env
LABORIN_API_BASE_URL=http://host.docker.internal:3000/api/v1
```

`extra_hosts: host.docker.internal:host-gateway` ya está configurado en `docker-compose.yml`. Si el backend está en otra red de Compose, usá el nombre del servicio en vez de `host.docker.internal`.

Para modo webhook, `TELEGRAM_WEBHOOK_URL` debe ser una URL HTTPS públicamente alcanzable que apunte al puerto publicado; si está vacío el contenedor usa polling.

Sin Compose:

```bash
docker build -t laborin-bot .
docker run --rm -p 3001:3001 -e BOT_DRY_RUN=true -e TELEGRAM_BOT_TOKEN=dummy laborin-bot
```
