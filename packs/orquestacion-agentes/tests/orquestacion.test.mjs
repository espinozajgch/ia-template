import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { compilarContexto } from '../tools/contexto.mjs';
import { clasificarTarea, decidirModelo } from '../tools/routing.mjs';
import { evaluarCasos } from '../tools/benchmark.mjs';

const policy = JSON.parse(await readFile(new URL('../politica-contexto.json', import.meta.url), 'utf8'));
const models = JSON.parse(await readFile(new URL('../modelos.json', import.meta.url), 'utf8'));

test('compila dentro del presupuesto, deduplica y excluye secretos', () => {
  const result = compilarContexto({
    request: 'corrige el handler',
    tokenBudget: 100,
    candidates: [
      { id: 's', kind: 'structure', source: 'graph', text: 'API → handler', score: 1 },
      { id: 'a', kind: 'code', source: 'a.ts:1', text: 'export function handler() {}', score: 0.9 },
      { id: 'dup', kind: 'code', source: 'b.ts:1', text: 'export function handler() {}', score: 0.8 },
      { id: 'secret', kind: 'code', source: '.env:1', text: 'API_KEY=abcdefghijklmnop', score: 1 },
      { id: 'noise', kind: 'memory', source: 'memory', text: 'irrelevante', score: 0.01 },
    ],
  }, policy);

  assert.ok(result.budget.used <= result.budget.limit);
  assert.deepEqual(result.selectedContext.map((item) => item.id), ['s', 'a']);
  assert.equal(result.excludedContext.find((item) => item.id === 'dup').reason, 'duplicado');
  assert.equal(result.excludedContext.find((item) => item.id === 'secret').reason, 'sensible');
  assert.equal(result.excludedContext.find((item) => item.id === 'noise').reason, 'relevancia-baja');
});

test('declara el hueco cuando falta estructura', () => {
  const result = compilarContexto({
    request: 'documenta el módulo',
    candidates: [{ id: 'd', kind: 'code', source: 'a.ts', text: 'const a = 1', score: 1 }],
  }, policy);
  assert.ok(result.coverageGaps.includes('sin contexto estructural'));
});

test('Laya de baja confianza cae al clasificador local', () => {
  const result = clasificarTarea('migra la base de datos de producción', {
    confidence: 0.4,
    difficulty: 1,
    risk: 'low',
  }, 0.85);
  assert.equal(result.source, 'fallback-local');
  assert.equal(result.risk, 'high');
  assert.equal(result.difficulty, 5);
});

test('Laya nunca rebaja una petición crítica', () => {
  const result = clasificarTarea('cambia las credenciales de producción', {
    confidence: 0.99,
    difficulty: 1,
    risk: 'low',
    intent: 'change',
  }, 0.85);
  assert.equal(result.source, 'laya');
  assert.equal(result.risk, 'high');
  assert.equal(decidirModelo(result, models).profile, 'frontier');
});

test('el router usa fast, balanced y frontier por reglas explícitas', () => {
  assert.equal(decidirModelo({ difficulty: 1, risk: 'low' }, models).profile, 'fast');
  assert.equal(decidirModelo({ difficulty: 3, risk: 'medium' }, models).profile, 'balanced');
  assert.equal(decidirModelo({ difficulty: 4, risk: 'medium' }, models).profile, 'frontier');
});

test('el benchmark falla de forma visible ante una expectativa incorrecta', () => {
  const report = evaluarCasos([
    { id: 'ok', request: 'corrige un comentario', expected: { risk: 'low', profile: 'fast' } },
    { id: 'fail', request: 'migra producción', expected: { risk: 'low', profile: 'fast' } },
  ], models);
  assert.equal(report.total, 2);
  assert.equal(report.passed, 1);
  assert.equal(report.failed, 1);
});
