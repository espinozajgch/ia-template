#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const KINDS = new Set(['structure', 'code', 'impact', 'memory', 'external_docs', 'infrastructure']);

function normalizar(texto) {
  return String(texto ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function identificador(candidato, texto) {
  return candidato.id || createHash('sha256').update(`${candidato.source ?? ''}\0${texto}`).digest('hex').slice(0, 16);
}

function tokensDe(texto, charsPerToken) {
  return Math.max(1, Math.ceil(texto.length / charsPerToken));
}

function patronSensible(texto, patrones) {
  return patrones.some((patron) => new RegExp(patron, 'i').test(texto));
}

export function compilarContexto(entrada, politica) {
  if (!entrada || typeof entrada.request !== 'string' || !entrada.request.trim()) {
    throw new Error('request es obligatorio');
  }
  if (!Array.isArray(entrada.candidates)) throw new Error('candidates debe ser un array');

  const limit = Number(entrada.tokenBudget ?? politica.tokenBudget);
  const charsPerToken = Number(politica.charsPerToken ?? 4);
  if (!Number.isInteger(limit) || limit < 1) throw new Error('tokenBudget debe ser un entero positivo');
  if (!(charsPerToken > 0)) throw new Error('charsPerToken debe ser positivo');

  const shares = politica.kindShares ?? {};
  const caps = Object.fromEntries([...KINDS].map((kind) => [kind, Math.floor(limit * Number(shares[kind] ?? 0))]));
  const minimumScore = Number(politica.minimumScore ?? 0);
  const sensitivePatterns = politica.sensitivePatterns ?? [];
  const seen = new Set();
  const excludedContext = [];

  const candidates = entrada.candidates.map((candidate, index) => {
    const text = normalizar(candidate.text);
    return {
      ...candidate,
      id: identificador(candidate, text || `vacio-${index}`),
      kind: KINDS.has(candidate.kind) ? candidate.kind : 'code',
      source: String(candidate.source ?? 'desconocida'),
      reason: String(candidate.reason ?? 'relevante para la petición'),
      text,
      score: Number(candidate.score ?? 0),
      required: candidate.required === true,
      tokens: tokensDe(text || ' ', charsPerToken),
    };
  }).filter((candidate) => {
    if (!candidate.text) {
      excludedContext.push({ id: candidate.id, reason: 'vacio' });
      return false;
    }
    if (candidate.sensitive === true || patronSensible(candidate.text, sensitivePatterns)) {
      excludedContext.push({ id: candidate.id, reason: 'sensible' });
      return false;
    }
    const digest = createHash('sha256').update(candidate.text).digest('hex');
    if (seen.has(digest)) {
      excludedContext.push({ id: candidate.id, reason: 'duplicado' });
      return false;
    }
    seen.add(digest);
    if (!candidate.required && candidate.score < minimumScore) {
      excludedContext.push({ id: candidate.id, reason: 'relevancia-baja' });
      return false;
    }
    return true;
  });

  candidates.sort((a, b) => Number(b.required) - Number(a.required) || b.score - a.score || a.id.localeCompare(b.id));
  const selectedContext = [];
  const usedByKind = Object.fromEntries([...KINDS].map((kind) => [kind, 0]));
  const exceededRequiredKinds = new Set();
  let used = 0;

  for (const candidate of candidates) {
    const cap = caps[candidate.kind] || limit;
    const exceedsKind = usedByKind[candidate.kind] + candidate.tokens > cap;
    const exceedsTotal = used + candidate.tokens > limit;
    if (exceedsTotal || (exceedsKind && !candidate.required)) {
      excludedContext.push({ id: candidate.id, reason: exceedsTotal ? 'presupuesto-total' : `presupuesto-${candidate.kind}` });
      continue;
    }
    if (exceedsKind && candidate.required) exceededRequiredKinds.add(candidate.kind);
    selectedContext.push({
      id: candidate.id,
      kind: candidate.kind,
      source: candidate.source,
      text: candidate.text,
      tokens: candidate.tokens,
      reason: candidate.reason,
    });
    used += candidate.tokens;
    usedByKind[candidate.kind] += candidate.tokens;
  }

  const coverageGaps = [...(entrada.coverageGaps ?? [])];
  if (!selectedContext.some((item) => item.kind === 'structure')) coverageGaps.push('sin contexto estructural');
  if (excludedContext.some((item) => item.reason.startsWith('presupuesto-'))) coverageGaps.push('hay candidatos relevantes fuera del presupuesto');
  for (const kind of exceededRequiredKinds) coverageGaps.push(`los obligatorios exceden el cupo de ${kind}`);

  return {
    version: 1,
    request: entrada.request.trim(),
    selectedContext,
    excludedContext,
    budget: { limit, used, remaining: limit - used, byKind: usedByKind },
    coverageGaps: [...new Set(coverageGaps)],
  };
}

async function main(argv) {
  const inputIndex = argv.indexOf('--input');
  const policyIndex = argv.indexOf('--policy');
  if (inputIndex < 0 || policyIndex < 0) {
    console.error('uso: contexto.mjs --input entrada.json --policy politica-contexto.json');
    process.exitCode = 2;
    return;
  }
  const [entrada, politica] = await Promise.all([
    readFile(argv[inputIndex + 1], 'utf8').then(JSON.parse),
    readFile(argv[policyIndex + 1], 'utf8').then(JSON.parse),
  ]);
  process.stdout.write(`${JSON.stringify(compilarContexto(entrada, politica), null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  });
}
