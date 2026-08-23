/**
 * El cálculo, probado contra los DOS regímenes reales de los que salió.
 *
 * Si el núcleo genérico no reproduce lo que ya hacen laboratorio y ppsport, es que no
 * era genérico: era el de uno de los dos con otro nombre.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularFactura, redondear, alicuotaDe, numeroControl, numeroVisible, fechaEmision,
  esIdFiscal, normalizarIdFiscal, FORMATOS, convertir,
  type LineaEntrada, type ConfiguracionFiscal,
} from './calculo';

// ── Régimen A · Venezuela (laboratorio) ───────────────────────────────────────
// Servicios médicos exentos conviviendo con productos al tipo general.
const VE: ConfiguracionFiscal = { alicuotas: { general: 16, reducida: 8 } };

// ── Régimen B · Argentina (ppsport) ───────────────────────────────────────────
// Tipo general del 21 % y retención de ganancias sobre la base.
const AR: ConfiguracionFiscal = { alicuotas: { general: 21 }, retencion: { nombre: 'Ganancias', porcentaje: 6 } };

describe('redondeo', () => {
  it('redondea a medios arriba', () => {
    expect(redondear(1.005)).toBe(1.01);   // en binario es 1.00499…: sin corrección daría 1.00
    expect(redondear(2.675)).toBe(2.68);
    expect(redondear(1.004)).toBe(1.00);
  });
  it('respeta los decimales pedidos', () => {
    expect(redondear(1234.567, 0)).toBe(1235);
    expect(redondear(1.23456, 4)).toBe(1.2346);
  });
  it('no rompe con negativos', () => expect(redondear(-1.005)).toBe(-1.01));
});

describe('régimen venezolano · exento junto a gravado', () => {
  const lineas: LineaEntrada[] = [
    { concepto: 'Consulta médica', cantidad: 1, precioUnitario: 40, tratamiento: 'exento' },
    { concepto: 'Reactivo',        cantidad: 2, precioUnitario: 25, tratamiento: 'general' },
    { concepto: 'Insumo básico',   cantidad: 1, precioUnitario: 10, tratamiento: 'reducida' },
  ];
  const t = calcularFactura(lineas, VE);

  it('no cobra impuesto sobre lo exento', () => {
    expect(t.lineas[0].impuesto).toBe(0);
    expect(t.lineas[0].total).toBe(40);
    expect(t.totalSinImpuesto).toBe(40);
  });
  it('aplica cada alícuota a su línea', () => {
    expect(t.lineas[1].base).toBe(50);
    expect(t.lineas[1].impuesto).toBe(8);      // 50 × 16 %
    expect(t.lineas[2].impuesto).toBe(0.8);    // 10 × 8 %
  });
  it('separa base imponible de lo exento', () => {
    expect(t.baseImponible).toBe(60);
    expect(t.impuesto).toBe(8.8);
  });
  it('desglosa por alícuota, como pide el libro de ventas', () => {
    expect(t.porAlicuota).toEqual([
      { alicuota: 8,  base: 10, impuesto: 0.8 },
      { alicuota: 16, base: 50, impuesto: 8 },
    ]);
  });
  it('el total cuadra con la suma de las líneas', () => {
    expect(t.total).toBe(108.8);
    expect(redondear(t.lineas.reduce((n, l) => n + l.total, 0))).toBe(t.total);
  });
  it('sin retención, el total a cobrar es el total', () => {
    expect(t.retencion).toBeNull();
    expect(t.totalACobrar).toBe(t.total);
  });
});

describe('régimen argentino · con retención', () => {
  const t = calcularFactura(
    [{ concepto: 'Servicios de intermediación', cantidad: 1, precioUnitario: 1000, tratamiento: 'general' }],
    AR,
  );
  it('aplica el tipo general', () => {
    expect(t.baseImponible).toBe(1000);
    expect(t.impuesto).toBe(210);
    expect(t.total).toBe(1210);
  });
  it('retiene sobre la BASE, no sobre el total', () => {
    // El error clásico es retener sobre 1210: el cliente retiene una parte de lo que te
    // debe por el servicio, y el impuesto repercutido no se toca.
    expect(t.retencion).toEqual({ nombre: 'Ganancias', porcentaje: 6, importe: 60 });
    expect(t.totalACobrar).toBe(1150);
  });
});

describe('descuentos', () => {
  it('se aplican ANTES del impuesto', () => {
    const t = calcularFactura(
      [{ concepto: 'x', cantidad: 1, precioUnitario: 100, tratamiento: 'general', descuentoPct: 10 }], AR);
    expect(t.baseImponible).toBe(90);
    expect(t.impuesto).toBe(18.9);   // no 21, que es lo que saldría descontando después
  });
});

describe('casos que suelen romper el cálculo', () => {
  it('factura vacía da ceros, no NaN', () => {
    const t = calcularFactura([], VE);
    expect(t.total).toBe(0);
    expect(t.porAlicuota).toEqual([]);
    expect(Number.isNaN(t.impuesto)).toBe(false);
  });
  it('valores basura se tratan como cero, no propagan NaN', () => {
    const t = calcularFactura(
      [{ concepto: 'x', cantidad: NaN, precioUnitario: undefined as unknown as number, tratamiento: 'general' }], VE);
    expect(t.total).toBe(0);
  });
  it('redondea POR LÍNEA, para que la factura impresa cuadre', () => {
    // Tres líneas de 0.335 al 16 %: cada una redondea a 0.05 de impuesto.
    // Redondeando al final saldría 0.16; el lector que suma lo impreso ve 0.15.
    const l: LineaEntrada[] = Array.from({ length: 3 }, () =>
      ({ concepto: 'x', cantidad: 1, precioUnitario: 0.335, tratamiento: 'general' as const }));
    const t = calcularFactura(l, VE);
    expect(t.lineas[0].impuesto).toBe(0.05);
    expect(t.impuesto).toBe(0.15);
    expect(redondear(t.lineas.reduce((n, x) => n + x.total, 0))).toBe(t.total);
  });
  it('un tratamiento sin alícuota configurada no inventa impuesto', () => {
    const t = calcularFactura(
      [{ concepto: 'x', cantidad: 1, precioUnitario: 100, tratamiento: 'superreducida' }], AR);
    expect(t.impuesto).toBe(0);   // AR no declara superreducida
  });
  it('no sujeta se comporta como exenta', () => {
    expect(alicuotaDe('noSujeta', VE.alicuotas)).toBe(0);
  });
});

describe('numeración', () => {
  it('el visible es el que se imprime', () => expect(numeroVisible(2026, 7)).toBe('2026-0007'));
  it('el de control distingue la entidad emisora', () => {
    expect(numeroControl('SDG', 2026, 7)).toBe('SDG-2026-0007');
    // Dos entidades pueden ir por el correlativo 7 el mismo año sin colisionar.
    expect(numeroControl('CJP', 2026, 7)).not.toBe(numeroControl('SDG', 2026, 7));
  });
  it('la fecha va en el formato que piden los regímenes', () => {
    expect(fechaEmision('2026-03-09')).toBe('09/03/2026');
  });
});

describe('identificador fiscal', () => {
  it('valida y normaliza el venezolano', () => {
    expect(esIdFiscal('J123456789', FORMATOS.VE)).toBe(true);
    expect(normalizarIdFiscal('j-12345678-9', FORMATOS.VE)).toBe('J-12345678-9');
  });
  it('valida y normaliza el argentino', () => {
    expect(esIdFiscal('20-12345678-9', FORMATOS.AR)).toBe(true);
    expect(normalizarIdFiscal('20123456789', FORMATOS.AR)).toBe('20-12345678-9');
  });
  it('rechaza lo que no tiene la forma', () => {
    expect(esIdFiscal('12345', FORMATOS.VE)).toBe(false);
    expect(esIdFiscal(null, FORMATOS.AR)).toBe(false);
  });
});

describe('doble moneda', () => {
  it('convierte con la tasa del documento', () => {
    const c = { moneda: 'VES', tasa: 36.5, fechaTasa: '2026-03-09' };
    expect(convertir(108.8, c)).toBe(3971.2);
  });
  it('una tasa nueva NO altera lo ya convertido', () => {
    // La prueba es de intención: el importe convertido se guarda junto a su tasa, y
    // recalcular con otra produce OTRO número — por eso no se recalcula nunca.
    const viejo = convertir(100, { moneda: 'VES', tasa: 36.5, fechaTasa: '2026-03-09' });
    const nuevo = convertir(100, { moneda: 'VES', tasa: 41.2, fechaTasa: '2026-04-01' });
    expect(viejo).not.toBe(nuevo);
    expect(viejo).toBe(3650);
  });
});
