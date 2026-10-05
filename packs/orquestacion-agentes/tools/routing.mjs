#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const HIGH_RISK = /\b(producci[oó]n|seguridad|credencial|migraci[oó]n|contrato externo|borrar|desplegar|pagos?)\b/i;
const CROSS_SCOPE = /\b(transversal|multirrepo|varios repos|arquitectura|refactor|migraci[oó]n)\b/i;
const SIMPLE = /\b(documenta|renombra|formato|typo|tipogr[aá]fico|comentario)\b/i;

export function clasificarTarea(request, layaDecision, threshold = 0.85) {
  if (typeof request !== 'string' || !request.trim()) throw new Error('request es obligatorio');
  if (layaDecision && Number(layaDecision.confidence) >= threshold) {
    const difficulty = Math.max(1, Math.min(5, Number(layaDecision.difficulty) || 3));
    const risk = HIGH_RISK.test(request) ? 'high' : (layaDecision.risk ?? 'medium');
    return {
      intent: layaDecision.intent ?? 'change',
      difficulty,
      risk,
      needsExternalDocs: layaDecision.needsExternalDocs === true,
      needsProjectMemory: layaDecision.needsProjectMemory !== false,
      needsInfrastructure: layaDecision.needsInfrastructure === true,
      needsSubagents: layaDecision.needsSubagents === true,
      source: 'laya',
      confidence: Number(layaDecision.confidence),
      fallbackReason: null,
    };
  }

  const highRisk = HIGH_RISK.test(request);
  const crossScope = CROSS_SCOPE.test(request);
  const simple = SIMPLE.test(request) && !crossScope && !highRisk;
  return {
    intent: /\b(audita|revisa|analiza|diagnostica)\b/i.test(request) ? 'audit' : 'change',
    difficulty: highRisk ? 5 : crossScope ? 4 : simple ? 1 : 3,
    risk: highRisk ? 'high' : crossScope ? 'medium' : 'low',
    needsExternalDocs: /\b(documentaci[oó]n|librer[ií]a|sdk|api externa)\b/i.test(request),
    needsProjectMemory: true,
    needsInfrastructure: /\b(infraestructura|incidente|cloudwatch|grafana|kubernetes|producci[oó]n)\b/i.test(request),
    needsSubagents: /\b(multirrepo|varios repos|paralel)\b/i.test(request),
    source: 'fallback-local',
    confidence: 1,
    fallbackReason: layaDecision ? 'confianza-laya-insuficiente' : 'laya-no-disponible',
  };
}

function coincide(classification, when) {
  if (when.risk && classification.risk !== when.risk) return false;
  if (when.minimumDifficulty && classification.difficulty < when.minimumDifficulty) return false;
  if (when.maximumDifficulty && classification.difficulty > when.maximumDifficulty) return false;
  return true;
}

export function decidirModelo(classification, config) {
  const rule = config.rules.find((candidate) => coincide(classification, candidate.when ?? {}));
  if (!rule) throw new Error('ninguna regla de routing coincide');
  const profile = config.profiles[rule.profile];
  if (!profile) throw new Error(`perfil desconocido: ${rule.profile}`);
  return {
    rule: rule.id,
    profile: rule.profile,
    model: profile.model,
    reasoning: profile.reasoning,
    reason: `difficulty=${classification.difficulty}; risk=${classification.risk}`,
    reviewerRequired: classification.risk === 'high',
  };
}

async function main(argv) {
  const inputIndex = argv.indexOf('--input');
  const configIndex = argv.indexOf('--config');
  if (inputIndex < 0 || configIndex < 0) {
    console.error('uso: routing.mjs --input tarea.json --config modelos.json');
    process.exitCode = 2;
    return;
  }
  const [input, config] = await Promise.all([
    readFile(argv[inputIndex + 1], 'utf8').then(JSON.parse),
    readFile(argv[configIndex + 1], 'utf8').then(JSON.parse),
  ]);
  const classification = clasificarTarea(input.request, input.layaDecision, input.layaConfidenceThreshold);
  process.stdout.write(`${JSON.stringify({ classification, routing: decidirModelo(classification, config) }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
