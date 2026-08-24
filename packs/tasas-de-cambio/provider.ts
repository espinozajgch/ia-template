/**
 * Contrato del que depende TODO el servicio de tasas de cambio.
 *
 * Ninguna otra parte de la aplicación conoce al BCV: consumen esta interfaz. Si
 * mañana el BCV publica una API oficial, basta con escribir un provider nuevo
 * —`BCVApiProvider`— y registrarlo; ni el job, ni el almacén, ni la API REST
 * cambian.
 */

/** Monedas que el servicio sabe interpretar. Una desconocida se rechaza. */
export const knownCurrencies = ["USD", "EUR", "CNY", "TRY", "RUB"] as const;
export type KnownCurrency = (typeof knownCurrencies)[number];

export const isKnownCurrency = (value: string): value is KnownCurrency =>
  (knownCurrencies as readonly string[]).includes(value);

/** Atribución obligatoria: el dato no es nuestro y debe verse de dónde sale. */
export const BCV_SOURCE = "BCV" as const;
export const MANUAL_SOURCE = "MANUAL" as const;

export const SOURCE_DISCLAIMER =
  "Esta API no está afiliada ni respaldada por el Banco Central de Venezuela. "
  + "Únicamente consume información pública publicada por dicho organismo.";

/** Una tasa tal y como la entrega un provider, antes de validarse y guardarse. */
export type ExchangeRateQuote = {
  currency: string;
  rate: number;
  /** Día para el que rige, en formato AAAA-MM-DD. */
  effectiveDate: string;
  /** Cuándo lo publicó el origen, si lo indica. */
  publishedAt: Date | null;
  /** Cuándo lo obtuvo este servicio. */
  retrievedAt: Date;
  source: string;
  /** Huella del fragmento del que se extrajo: distingue relectura de cambio. */
  rawHash: string;
};

export type ProviderResult = {
  quotes: ExchangeRateQuote[];
  /** Duración de la obtención, para la bitácora del job. */
  durationMs: number;
};

export interface ExchangeRateProvider {
  /** Nombre para los registros; no se usa para decidir nada. */
  readonly name: string;
  /** Obtiene las tasas vigentes. Lanza si el origen no responde o cambió. */
  fetchRates(): Promise<ProviderResult>;
}

/** El origen respondió, pero su estructura ya no es la esperada. */
export class ExchangeRateStructureError extends Error { }
/** No se pudo llegar al origen: red, tiempo agotado, código HTTP de error. */
export class ExchangeRateFetchError extends Error { }
