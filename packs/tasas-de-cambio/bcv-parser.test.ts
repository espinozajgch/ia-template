import { describe, expect, it } from "vitest";
import { parseBcvPage, parseSpanishDate, parseVenezuelanNumber } from "./bcv-parser.js";
import { ExchangeRateStructureError } from "./provider.js";

const retrievedAt = new Date("2026-08-03T13:00:00.000Z");

/** Estructura equivalente a la que publica el BCV, reducida a lo esencial. */
const paginaBcv = `
<html><body>
  <div id="dolar"><div class="field-content"><span>USD</span></div>
    <div class="col-sm-6 col-xs-6 centrado"><strong> 36,59480000 </strong></div></div>
  <div id="euro"><div class="field-content"><span>EUR</span></div>
    <div class="col-sm-6 col-xs-6 centrado"><strong> 40,12500000 </strong></div></div>
  <div class="pull-right dinpro center"><span class="date-display-single" content="2026-08-04T00:00:00-04:00">
    Fecha Valor: Martes, 04 Agosto 2026</span></div>
</body></html>`;

describe("parseVenezuelanNumber", () => {
  it("lee el formato es-VE: punto de millar y coma decimal", () => {
    expect(parseVenezuelanNumber("36.594,12")).toBe(36594.12);
    expect(parseVenezuelanNumber(" 36,59480000 ")).toBeCloseTo(36.5948, 6);
    expect(parseVenezuelanNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("devuelve null cuando no hay un número que leer", () => {
    expect(parseVenezuelanNumber("")).toBeNull();
    expect(parseVenezuelanNumber("Bs.")).toBeNull();
    expect(parseVenezuelanNumber("12,34,56")).toBeNull();
  });
});

describe("parseSpanishDate", () => {
  it("prefiere la fecha ISO cuando la página la trae", () => {
    expect(parseSpanishDate("2026-08-04T00:00:00-04:00")).toBe("2026-08-04");
  });

  it("entiende la fecha escrita en español, con y sin «de»", () => {
    expect(parseSpanishDate("Fecha Valor: Martes, 04 Agosto 2026")).toBe("2026-08-04");
    expect(parseSpanishDate("4 de agosto de 2026")).toBe("2026-08-04");
    expect(parseSpanishDate("15 de Diciembre de 2026")).toBe("2026-12-15");
  });

  it("devuelve null si no hay fecha reconocible", () => {
    expect(parseSpanishDate("Banco Central de Venezuela")).toBeNull();
  });
});

describe("parseBcvPage", () => {
  it("extrae moneda, tasa y fecha de vigencia", () => {
    const { quotes, effectiveDate } = parseBcvPage(paginaBcv, retrievedAt);
    expect(effectiveDate).toBe("2026-08-04");
    const dolar = quotes.find((quote) => quote.currency === "USD");
    expect(dolar?.rate).toBeCloseTo(36.5948, 6);
    expect(dolar?.effectiveDate).toBe("2026-08-04");
    expect(dolar?.source).toBe("BCV");
    expect(dolar?.retrievedAt).toBe(retrievedAt);
    expect(quotes.find((quote) => quote.currency === "EUR")?.rate).toBeCloseTo(40.125, 6);
  });

  it("la huella distingue una relectura idéntica de un cambio real", () => {
    const primera = parseBcvPage(paginaBcv, retrievedAt).quotes[0];
    const segunda = parseBcvPage(paginaBcv, new Date()).quotes[0];
    expect(segunda.rawHash).toBe(primera.rawHash);
    const distinta = parseBcvPage(paginaBcv.replace("36,59480000", "37,00000000"), retrievedAt).quotes[0];
    expect(distinta.rawHash).not.toBe(primera.rawHash);
  });

  it("no depende de las clases CSS: sobrevive a un rediseño que las cambie", () => {
    const rediseñada = paginaBcv
      .replace(/class="[^"]*"/g, 'class="rediseño-2027"')
      .replace(/<div id="dolar">/, "<article>")
      .replace("</div>\n  <div id=\"euro\">", "</article>\n  <article>");
    const { quotes } = parseBcvPage(rediseñada, retrievedAt);
    expect(quotes.find((quote) => quote.currency === "USD")?.rate).toBeCloseTo(36.5948, 6);
  });

  it("avisa de un cambio de estructura en vez de devolver datos vacíos", () => {
    // La página responde, pero ya no publica ninguna tasa reconocible.
    const sinTasas = `<html><body><p>Fecha Valor: Martes, 04 Agosto 2026</p>
      <p>Portal en mantenimiento</p></body></html>`;
    expect(() => parseBcvPage(sinTasas, retrievedAt)).toThrow(ExchangeRateStructureError);
  });

  it("avisa cuando falta la fecha de vigencia", () => {
    const sinFecha = `<html><body><div><span>USD</span><strong>36,59</strong></div></body></html>`;
    expect(() => parseBcvPage(sinFecha, retrievedAt)).toThrow(ExchangeRateStructureError);
  });
});
