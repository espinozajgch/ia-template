/**
 * El cálculo de una factura. Genérico, puro y sin dependencias.
 *
 * Sale de fundir dos implementaciones reales que resolvieron el mismo problema para
 * regímenes distintos: una venezolana con tratamientos exento/general/reducida y desglose
 * por alícuota para el libro de ventas, y una argentina con varias entidades emisoras,
 * identificador fiscal genérico y retención.
 *
 * Lo que aquí hay es lo que aparecía en las DOS. Lo que cambiaba entre ellas —el nombre
 * del identificador fiscal, los porcentajes, el formato del número— es configuración y
 * entra por parámetro.
 *
 * ── Las cuatro reglas que hacen que esto no dé disgustos ──────────────────────
 *
 * 1 · UNA SOLA FUENTE DE LOS IMPORTES. Cliente y servidor llaman a esta función. Dos
 *     implementaciones del mismo cálculo divergen en el redondeo, y el día que un total
 *     no cuadra con la suma de sus líneas nadie sabe cuál de las dos mintió.
 *
 * 2 · SE REDONDEA POR LÍNEA, NO AL FINAL. Es lo que exigen casi todos los regímenes, y
 *     además es lo que hace que la factura impresa cuadre: el lector suma las líneas que
 *     ve, no los decimales que no ve.
 *
 * 3 · LO EMITIDO NO SE RECALCULA. Una factura guarda sus importes y su tasa de cambio.
 *     Cambiar la alícuota o la tasa mañana no puede alterar lo que ya se emitió: eso no
 *     es un recálculo, es falsificar un documento.
 *
 * 4 · EL CORRELATIVO NO SE SALTA. Ver `series.sql`.
 */

/** Cómo tributa una línea. Los nombres son del régimen; el mecanismo es universal. */
export type Tratamiento = 'exento' | 'general' | 'reducida' | 'superreducida' | 'noSujeta';

export type Alicuotas = {
  general: number;
  reducida?: number;
  superreducida?: number;
};

/**
 * Retención practicada por el CLIENTE sobre la base imponible. La tienen los regímenes
 * de autónomos (IRPF en España, ganancias en Argentina) y no la tienen otros.
 * Se resta del total a cobrar, pero NO reduce el impuesto repercutido.
 */
export type Retencion = { nombre: string; porcentaje: number };

export type ConfiguracionFiscal = {
  alicuotas: Alicuotas;
  retencion?: Retencion;
  /** Decimales del importe. Dos en casi todo el mundo; cero donde no hay céntimos. */
  decimales?: number;
};

export type LineaEntrada = {
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  tratamiento: Tratamiento;
  /** Descuento sobre la línea, en porcentaje. Se aplica ANTES del impuesto. */
  descuentoPct?: number;
};

export type LineaCalculada = LineaEntrada & {
  alicuota: number;
  exenta: boolean;
  base: number;
  impuesto: number;
  total: number;
};

export type TotalesFactura = {
  lineas: LineaCalculada[];
  /** Base de las líneas que no llevan impuesto (exentas o no sujetas). */
  totalSinImpuesto: number;
  /** Base de las líneas que sí lo llevan. */
  baseImponible: number;
  impuesto: number;
  /** Desglose por tipo, que es como lo pide cualquier libro de ventas. */
  porAlicuota: { alicuota: number; base: number; impuesto: number }[];
  retencion: { nombre: string; porcentaje: number; importe: number } | null;
  /** Lo que suma la factura antes de restar la retención. */
  total: number;
  /** Lo que el cliente paga de verdad. Sin retención, coincide con `total`. */
  totalACobrar: number;
};

export const aNumero = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Redondeo a medios arriba, con corrección del error de coma flotante.
 * Sin el epsilon, `1.005` se redondea a `1.00` porque en binario es `1.00499…`,
 * y una factura con céntimo de menos es una factura que no cuadra.
 */
export const redondear = (n: number, decimales = 2): number => {
  const f = 10 ** decimales;
  return Math.round((n + Number.EPSILON * Math.sign(n || 1)) * f) / f;
};

export function alicuotaDe(t: Tratamiento, a: Alicuotas): number {
  switch (t) {
    case 'general':       return a.general;
    case 'reducida':      return a.reducida ?? 0;
    case 'superreducida': return a.superreducida ?? 0;
    case 'exento':
    case 'noSujeta':      return 0;
  }
}

/** La única fuente de los importes. La llaman el cliente y el servidor. */
export function calcularFactura(lineas: LineaEntrada[], config: ConfiguracionFiscal): TotalesFactura {
  const dec = config.decimales ?? 2;
  const r = (n: number) => redondear(n, dec);

  const calculadas: LineaCalculada[] = lineas.map((l) => {
    const alicuota = alicuotaDe(l.tratamiento, config.alicuotas);
    const bruto = aNumero(l.cantidad) * aNumero(l.precioUnitario);
    const base = r(bruto * (1 - aNumero(l.descuentoPct ?? 0) / 100));
    const impuesto = r(base * (alicuota / 100));
    return {
      ...l,
      alicuota,
      exenta: alicuota === 0,
      base,
      impuesto,
      total: r(base + impuesto),
    };
  });

  const sinImpuesto  = r(calculadas.filter(l => l.exenta).reduce((n, l) => n + l.base, 0));
  const baseImponible = r(calculadas.filter(l => !l.exenta).reduce((n, l) => n + l.base, 0));
  const impuesto      = r(calculadas.reduce((n, l) => n + l.impuesto, 0));

  const mapa = new Map<number, { base: number; impuesto: number }>();
  for (const l of calculadas) {
    if (l.exenta) continue;
    const previo = mapa.get(l.alicuota) ?? { base: 0, impuesto: 0 };
    mapa.set(l.alicuota, { base: r(previo.base + l.base), impuesto: r(previo.impuesto + l.impuesto) });
  }

  const total = r(sinImpuesto + baseImponible + impuesto);

  // La retención se calcula sobre la base imponible, NO sobre el total: el cliente
  // retiene una parte de lo que te debe y la ingresa en tu nombre. El impuesto
  // repercutido no se toca.
  const ret = config.retencion && config.retencion.porcentaje > 0
    ? { nombre: config.retencion.nombre, porcentaje: config.retencion.porcentaje,
        importe: r(baseImponible * (config.retencion.porcentaje / 100)) }
    : null;

  return {
    lineas: calculadas,
    totalSinImpuesto: sinImpuesto,
    baseImponible,
    impuesto,
    porAlicuota: [...mapa.entries()]
      .map(([alicuota, v]) => ({ alicuota, ...v }))
      .sort((a, b) => a.alicuota - b.alicuota),
    retencion: ret,
    total,
    totalACobrar: r(total - (ret?.importe ?? 0)),
  };
}

// ── Identificador fiscal ──────────────────────────────────────────────────────
/**
 * Cada país tiene el suyo y se llama distinto: RIF, CUIT, NIF, RUC, RFC, CNPJ.
 * Se declara por configuración, no se codifica en el producto.
 *
 * Y una decisión sobre los dígitos de control: **no se validan salvo que el algoritmo
 * esté confirmado**. Un verificador escrito de memoria rechaza identificadores válidos
 * —que es el fallo caro, porque bloquea a un cliente real— mientras que uno mal tecleado
 * se descubre en el primer trámite.
 */
export type FormatoFiscal = {
  /** Cómo se llama en este país: 'RIF', 'CUIT', 'NIF'… */
  etiqueta: string;
  patron: RegExp;
  normalizar?: (v: string) => string;
};

export const FORMATOS: Record<string, FormatoFiscal> = {
  VE: { etiqueta: 'RIF',  patron: /^[VEJPGC]-?\d{8}-?\d$/i,
        normalizar: v => { const c = v.trim().toUpperCase().replace(/-/g, ''); return `${c[0]}-${c.slice(1, 9)}-${c.slice(9)}`; } },
  AR: { etiqueta: 'CUIT', patron: /^\d{2}-?\d{8}-?\d$/,
        normalizar: v => { const c = v.replace(/\D/g, ''); return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`; } },
  ES: { etiqueta: 'NIF',  patron: /^[A-Z]?\d{7,8}[A-Z]?$/i,
        normalizar: v => v.trim().toUpperCase().replace(/[\s-]/g, '') },
  MX: { etiqueta: 'RFC',  patron: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i,
        normalizar: v => v.trim().toUpperCase().replace(/[\s-]/g, '') },
};

export const esIdFiscal = (v: unknown, f: FormatoFiscal): v is string =>
  typeof v === 'string' && f.patron.test(v.trim());

export const normalizarIdFiscal = (v: string, f: FormatoFiscal): string =>
  f.normalizar ? f.normalizar(v) : v.trim().toUpperCase();

// ── Numeración ────────────────────────────────────────────────────────────────
/** `AÑO-NNNN`: el que se imprime. */
export const numeroVisible = (anio: number, correlativo: number, ancho = 4): string =>
  `${anio}-${String(correlativo).padStart(ancho, '0')}`;

/** `ENTIDAD-AÑO-NNNN`: el interno, único aunque varias entidades emitan a la vez. */
export const numeroControl = (entidad: string, anio: number, correlativo: number, ancho = 4): string =>
  `${entidad}-${anio}-${String(correlativo).padStart(ancho, '0')}`;

/** Fecha de emisión en el formato que piden casi todos los regímenes: DD/MM/AAAA. */
export const fechaEmision = (fecha: string | Date): string => {
  const d = typeof fecha === 'string' ? new Date(fecha + (fecha.length === 10 ? 'T00:00:00' : '')) : fecha;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ── Doble moneda ──────────────────────────────────────────────────────────────
/**
 * El importe canónico vive en una moneda, y **cada documento guarda la tasa con la que se
 * convirtió**. Una tasa nueva jamás reescribe lo ya emitido: si se recalculara, la factura
 * de marzo cambiaría de importe en abril y el cliente tendría razón al quejarse.
 */
export type Conversion = { moneda: string; tasa: number; fechaTasa: string };

export const convertir = (importe: number, c: Conversion, decimales = 2): number =>
  redondear(importe * c.tasa, decimales);
