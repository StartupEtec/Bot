import test from 'node:test';
import assert from 'node:assert/strict';

import { createKnowledge, normalizeText } from '../src/knowledge/answerEngine.js';
import { startup } from '../src/knowledge/startup.js';

const knowledge = createKnowledge({ appUrl: startup.appUrl });

test('normaliza acentos y signos para buscar respuestas', () => {
  assert.equal(normalizeText('¿Qué es LABORIN?'), 'que es laborin');
});

test('encuentra una FAQ de la landing', () => {
  const answer = knowledge.find('¿Qué es Laborin?');
  assert.equal(answer?.id, 'que-es');
  assert.match(answer.answer, /on-demand/);
});

test('encuentra el flujo de cambio de rol del frontend', () => {
  const answer = knowledge.find('cómo cambio de rol');
  assert.equal(answer?.id, 'cambiar-rol');
  assert.match(answer.answer, /Mi Perfil/);
});

test('devuelve null cuando no hay coincidencia', () => {
  assert.equal(knowledge.find('receta de milanesas'), null);
});

test('el menú incluye botones con callback_data válidos', () => {
  const keyboard = knowledge.makeMainKeyboard();
  assert.ok(keyboard.inline_keyboard.length >= 2);
  assert.equal(keyboard.inline_keyboard[0][0].callback_data, 'info:que-es');
});
