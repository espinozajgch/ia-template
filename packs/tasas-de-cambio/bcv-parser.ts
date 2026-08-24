import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import {
  BCV_SOURCE,
  ExchangeRateStructureError,
  isKnownCurrency,
  knownCurrencies,
  type ExchangeRateQuote,
} from "./provider.js";

/**
 * Lectura del HTML público del BCV.
 *
 * Es una función pura: recibe el HTML y devuelve tasas. Así se puede probar el
 * caso real, el borde y el cambio de estructura sin tocar la red, que es donde
 * de verdad se rompe un scraper.
 *
 * No se ancla en clases CSS de presentación, que cambian con cada rediseño. El
 * anclaje es el **código de moneda** (`USD`, `EUR`…), que es el dato que la
 * página tiene que mostrar sí o sí para significar algo. Desde él se sube al
 * contenedor y se busca el número.
 */

/** El BCV escribe los importes en formato es-VE: 36.594,12 */
export function parseVenezuelanNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;
  // El punto es separador de millares y la coma, decimal.
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Fecha de vigencia. El BCV la publica como «Fecha Valor: Lunes, 04 Agosto 2026»
 * y también en un `<span content="...">` con formato ISO, que es más estable.
 */
const monthNames: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

export function parseSpanishDate(value: string): string | null {
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const textual = value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})|(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!textual) return null;
  const day = textual[1] ?? textual[4];
  const month = monthNames[textual[2] ?? textual[5] ?? ""];
  const year = textual[3] ?? textual[6];
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

/**
 * Hasta dónde se sube desde el código de moneda buscando su importe. Seis
 * niveles cubren cualquier maquetación razonable; más sería arriesgarse a
 * capturar el número de otra sección.
 */
const MAX_ANCESTOR_LEVELS = 6;

/** Huella del fragmento: dos lecturas idénticas producen el mismo valor. */
export const hashFragment = (value: string) =>
  createHash("sha256").update(value.replace(/\s+/g, " ").trim()).digest("hex");

export type ParsedBcvPage = {
  quotes: ExchangeRateQuote[];
  effectiveDate: string;
};

/**
 * Extrae las tasas del HTML del BCV.
 *
 * @param html Página completa descargada.
 * @param retrievedAt Momento de la descarga; lo inyecta quien llama para que la
 *   función siga siendo pura y comprobable.
 */
export function parseBcvPage(html: string, retrievedAt: Date): ParsedBcvPage {
  const $ = cheerio.load(html);

  // La fecha de vigencia va en un `content` ISO cuando existe; si no, se lee el
  // texto en español que acompaña a «Fecha Valor».
  const isoAttribute = $("[content]")
    .map((_index, element) => $(element).attr("content") ?? "")
    .get()
    .map((value) => parseSpanishDate(value))
    .find((value): value is string => Boolean(value));
  const textualDate = parseSpanishDate($("body").text());
  const effectiveDate = isoAttribute ?? textualDate;
  if (!effectiveDate) {
    throw new ExchangeRateStructureError(
      "No se encontró la fecha de vigencia en la página del BCV.",
    );
  }

  const quotes: ExchangeRateQuote[] = [];
  for (const currency of knownCurrencies) {
    // Se ancla en el código de moneda, no en clases de presentación.
    const marker = $("*")
      .filter((_index, element) => {
        const node = $(element);
        if (node.children().length > 0) return false;
        return node.text().trim().toUpperCase() === currency;
      })
      .first();
    if (!marker.length) continue;

    // El importe está cerca del código, pero no necesariamente en su mismo
    // contenedor: el BCV lo pone en un bloque hermano. Se sube nivel a nivel
    // hasta encontrar un ancestro que sí contenga un número, y se para en el
    // primero que lo tenga -el más cercano-. Si por el camino aparece otra
    // moneda conocida, se ha subido demasiado y se abandona: mejor no publicar
    // una tasa que publicar la del vecino.
    let rate: number | null = null;
    let text = "";
    let node = marker;
    for (let level = 0; level < MAX_ANCESTOR_LEVELS; level += 1) {
      const parent = node.parent();
      if (!parent.length) break;
      node = parent;
      const candidate = node.text();
      const otherCurrency = knownCurrencies.some(
        (other) => other !== currency && new RegExp(`\\b${other}\\b`).test(candidate.toUpperCase()),
      );
      if (otherCurrency) break;
      const parsed = parseVenezuelanNumber(candidate.replace(new RegExp(currency, "gi"), " "));
      if (parsed != null) {
        rate = parsed;
        text = candidate;
        break;
      }
    }
    if (rate == null) continue;

    quotes.push({
      currency,
      rate,
      effectiveDate,
      publishedAt: null,
      retrievedAt,
      source: BCV_SOURCE,
      rawHash: hashFragment(`${currency}|${effectiveDate}|${text}`),
    });
  }

  if (!quotes.length) {
    // No es un fallo de red: la página respondió pero ya no dice lo que decía.
    throw new ExchangeRateStructureError(
      "La página del BCV respondió, pero no contiene ninguna tasa reconocible. " +
        "Probablemente cambió su estructura.",
    );
  }
  // Una moneda desconocida no debería llegar aquí, pero si el catálogo crece y
  // alguien olvida validarla, se corta en el borde.
  return { quotes: quotes.filter((quote) => isKnownCurrency(quote.currency)), effectiveDate };
}
