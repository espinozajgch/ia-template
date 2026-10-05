#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilarContexto } from './contexto.mjs';
import { clasificarTarea, decidirModelo } from './routing.mjs';

const packDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function argumento(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main(argv) {
  const inputPath = argumento(argv, '--input');
  const outputPath = argumento(argv, '--output');
  if (!inputPath || !outputPath) {
    console.error('uso: pipeline.mjs --input candidatos.json --output bundle.json');
    process.exitCode = 2;
    return;
  }
  const [input, policy, models] = await Promise.all([
    readFile(inputPath, 'utf8').then(JSON.parse),
    readFile(resolve(packDir, 'politica-contexto.json'), 'utf8').then(JSON.parse),
    readFile(resolve(packDir, 'modelos.json'), 'utf8').then(JSON.parse),
  ]);
  const bundle = compilarContexto(input, policy);
  const classification = clasificarTarea(input.request, input.layaDecision, policy.layaConfidenceThreshold);
  bundle.routing = {
    classification,
    decision: decidirModelo(classification, models),
  };
  bundle.cache = {
    stablePrefix: ['agent-protocol', 'tool-contracts', 'output-schema'],
    variableSuffix: ['request', 'selected-context', 'tool-results'],
  };
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`✓ bundle: ${bundle.selectedContext.length} fragmentos · ${bundle.budget.used}/${bundle.budget.limit} tokens · ${bundle.routing.decision.profile}`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});

