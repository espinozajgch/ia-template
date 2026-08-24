import { isKnownCurrency, type ExchangeRateQuote } from "./provider.js";

/**
 * Reglas que decide qué se guarda, antes de tocar la base de datos.
 *
 * Son funciones puras a propósito: son la parte del servicio que no puede
 * fallar en silencio, y probarlas exige poder ejecutarlas sin red ni base.
 */

/**
 * Variación máxima admitida frente a la última tasa conocida.
 *
 * No es un límite de negocio: es un detector de errores de lectura. Un punto
 * decimal mal interpretado multiplica o divide por 100, y eso salta aquí. Una
 * devaluación real de más del 30 % en un día también se marca, y es correcto que
 * lo haga: se prefiere una revisión humana a publicar un dato inventado.
 */
export const MAX_DAILY_CHANGE_RATIO = 0.3;

export type ValidationFailure = { code: string; message: string };
export type ValidationResult =
  | { ok: true }
  | { ok: false; failure: ValidationFailure };

const fail = (code: string, message: string): ValidationResult => ({ ok: false, failure: { code, message } });

/** Fecha AAAA-MM-DD real: descarta 2026-02-31 y formatos malformados. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Comprueba una tasa recién obtenida.
 *
 * @param previous Última tasa conocida de esa moneda, si la hay. Sin ella no se
 *   puede juzgar la variación y solo se aplican las reglas absolutas.
 * @param today Fecha de hoy AAAA-MM-DD, inyectada para poder probar el futuro.
 */
export function validateQuote(
  quote: ExchangeRateQuote,
  previous: { rate: number; effectiveDate: string } | null,
  today: string,
): ValidationResult {
  if (!isKnownCurrency(quote.currency)) {
    return fail("UNKNOWN_CURRENCY", `Moneda no reconocida: ${quote.currency}.`);
  }
  if (!Number.isFinite(quote.rate) || quote.rate <= 0) {
    return fail("NON_POSITIVE_RATE", `La tasa debe ser mayor que cero (se recibió ${quote.rate}).`);
  }
  if (!isValidDate(quote.effectiveDate)) {
    return fail("INVALID_DATE", `Fecha de vigencia inválida: ${quote.effectiveDate}.`);
  }
  if (quote.effectiveDate > today) {
    // El BCV publica la tasa del día siguiente por la tarde, así que una fecha
    // futura no es rara; una muy lejana sí delata una lectura equivocada.
    const limit = new Date(`${today}T00:00:00.000Z`);
    limit.setUTCDate(limit.getUTCDate() + 7);
    if (quote.effectiveDate > limit.toISOString().slice(0, 10)) {
      return fail("FUTURE_DATE", `Fecha de vigencia demasiado lejana: ${quote.effectiveDate}.`);
    }
  }
  if (previous) {
    const change = Math.abs(quote.rate - previous.rate) / previous.rate;
    if (change > MAX_DAILY_CHANGE_RATIO) {
      return fail(
        "ANOMALOUS_CHANGE",
        `Variación de ${(change * 100).toFixed(1)} % frente a ${previous.rate} del ${previous.effectiveDate}: ` +
          "queda en cuarentena a la espera de revisión.",
      );
    }
  }
  return { ok: true };
}

/**
 * Qué hacer con una tasa cuya fecha ya está guardada.
 *
 * El histórico es inmutable: una fecha guardada no se reescribe nunca. Si el
 * contenido es idéntico, ni siquiera hay nada que registrar.
 */
export type DuplicateDecision = "identical" | "conflict";

export function classifyDuplicate(
  incoming: { rate: number; rawHash: string },
  stored: { rate: number; rawHash: string },
): DuplicateDecision {
  return incoming.rawHash === stored.rawHash && incoming.rate === stored.rate ? "identical" : "conflict";
}
