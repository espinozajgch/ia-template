#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clasificarTarea, decidirModelo } from './routing.mjs';

const packDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function evaluarCasos(casos, models) {
  const results = casos.map((caso) => {
    const classification = clasificarTarea(caso.request, caso.layaDecision, caso.threshold);
    const routing = decidirModelo(classification, models);
    const errors = [];
    if (caso.expected?.risk && classification.risk !== caso.expected.risk) errors.push(`risk: ${classification.risk} != ${caso.expected.risk}`);
    if (caso.expected?.profile && routing.profile !== caso.expected.profile) errors.push(`profile: ${routing.profile} != ${caso.expected.profile}`);
    return { id: caso.id, pass: errors.length === 0, errors, classification, routing };
  });
  return {
    total: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    results,
  };
}

async function main(argv) {
  const path = argv[0];
  if (!path) {
    console.error('uso: benchmark.mjs casos.jsonl');
    process.exitCode = 2;
    return;
  }
  const [body, models] = await Promise.all([
    readFile(path, 'utf8'),
    readFile(resolve(packDir, 'modelos.json'), 'utf8').then(JSON.parse),
  ]);
  const cases = body.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`JSONL inválido en línea ${index + 1}: ${error.message}`); }
  });
  const report = evaluarCasos(cases, models);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.failed) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
