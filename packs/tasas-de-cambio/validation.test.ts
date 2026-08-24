import { describe, expect, it } from "vitest";
import { classifyDuplicate, isValidDate, validateQuote } from "./validation.js";
import type { ExchangeRateQuote } from "./provider.js";

const quote = (overrides: Partial<ExchangeRateQuote> = {}): ExchangeRateQuote => ({
  currency: "USD",
  rate: 36.59,
  effectiveDate: "2026-08-04",
  publishedAt: null,
  retrievedAt: new Date("2026-08-04T13:00:00.000Z"),
  source: "BCV",
  rawHash: "hash-a",
  ...overrides,
});
const hoy = "2026-08-04";

describe("isValidDate", () => {
  it("acepta una fecha real y rechaza una imposible", () => {
    expect(isValidDate("2026-08-04")).toBe(true);
    expect(isValidDate("2026-02-31")).toBe(false);
    expect(isValidDate("04-08-2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("validateQuote", () => {
  it("acepta una tasa normal", () => {
    expect(validateQuote(quote(), null, hoy).ok).toBe(true);
  });

  it("rechaza una tasa que no sea mayor que cero", () => {
    for (const rate of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = validateQuote(quote({ rate }), null, hoy);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.code).toBe("NON_POSITIVE_RATE");
    }
  });

  it("rechaza una moneda desconocida", () => {
    const result = validateQuote(quote({ currency: "XYZ" }), null, hoy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("UNKNOWN_CURRENCY");
  });

  it("rechaza una fecha inválida", () => {
    const result = validateQuote(quote({ effectiveDate: "2026-13-40" }), null, hoy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("INVALID_DATE");
  });

  it("admite la tasa del día siguiente, que el BCV publica por adelantado", () => {
    expect(validateQuote(quote({ effectiveDate: "2026-08-05" }), null, hoy).ok).toBe(true);
  });

  it("rechaza una fecha futura lejana: delata una lectura equivocada", () => {
    const result = validateQuote(quote({ effectiveDate: "2027-01-01" }), null, hoy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("FUTURE_DATE");
  });

  it("marca como anómala una variación desproporcionada", () => {
    // Un punto decimal mal leído multiplica por 100: es lo que esto detecta.
    const previous = { rate: 36.59, effectiveDate: "2026-08-03" };
    const result = validateQuote(quote({ rate: 3659 }), previous, hoy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("ANOMALOUS_CHANGE");
  });

  it("acepta una variación diaria normal", () => {
    const previous = { rate: 36.59, effectiveDate: "2026-08-03" };
    expect(validateQuote(quote({ rate: 37.2 }), previous, hoy).ok).toBe(true);
  });

  it("sin tasa previa no puede juzgar la variación y solo aplica lo absoluto", () => {
    expect(validateQuote(quote({ rate: 100000 }), null, hoy).ok).toBe(true);
  });
});

describe("classifyDuplicate", () => {
  it("una relectura idéntica no es un conflicto", () => {
    expect(classifyDuplicate(
      { rate: 36.59, rawHash: "hash-a" },
      { rate: 36.59, rawHash: "hash-a" },
    )).toBe("identical");
  });

  it("un valor distinto para la misma fecha sí lo es", () => {
    expect(classifyDuplicate(
      { rate: 37.1, rawHash: "hash-b" },
      { rate: 36.59, rawHash: "hash-a" },
    )).toBe("conflict");
  });

  it("misma tasa con huella distinta también se revisa", () => {
    // El importe coincide pero el fragmento cambió: puede ser un rediseño o
    // que se esté leyendo otra celda. Se mira, no se asume.
    expect(classifyDuplicate(
      { rate: 36.59, rawHash: "hash-b" },
      { rate: 36.59, rawHash: "hash-a" },
    )).toBe("conflict");
  });
});
