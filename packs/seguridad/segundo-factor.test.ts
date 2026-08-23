/**
 * Los vectores del RFC 6238 son la prueba que importa: si el algoritmo casa con ellos,
 * casa con todas las aplicaciones de autenticación que existen. Cualquier otra prueba
 * comprueba mi código contra sí mismo.
 */
import { describe, it, expect } from 'vitest';
import {
  secretoNuevo, aBase32, deBase32, codigoDe, pasoDe, comprobar,
  uriDeAutenticacion, respaldosNuevos, normalizarRespaldo, PASO, DIGITOS,
} from './segundo-factor';

// El secreto de la RFC es "12345678901234567890" en ASCII.
const SECRETO_RFC = aBase32(new TextEncoder().encode('12345678901234567890'));

describe('vectores oficiales del RFC 6238', () => {
  // Tabla del apéndice B, para SHA-1 y 8 dígitos; aquí se comparan los 6 últimos,
  // que es la longitud que usan las aplicaciones.
  const vectores: [number, string][] = [
    [59,          '287082'],
    [1111111109,  '081804'],
    [1111111111,  '050471'],
    [1234567890,  '005924'],
    [2000000000,  '279037'],
  ];
  for (const [segundos, esperado] of vectores) {
    it(`t=${segundos} → ${esperado}`, () => {
      expect(codigoDe(SECRETO_RFC, Math.floor(segundos / PASO))).toBe(esperado);
    });
  }
});

describe('base32', () => {
  it('ida y vuelta', () => {
    const datos = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Uint8Array(deBase32(aBase32(datos)))).toEqual(datos);
  });
  it('un secreto nuevo es válido y del largo esperado', () => {
    const s = secretoNuevo();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(deBase32(s)).toHaveLength(20);   // los 20 bytes que recomienda la RFC 4226
  });
  it('dos secretos no se repiten', () => expect(secretoNuevo()).not.toBe(secretoNuevo()));
});

describe('comprobación', () => {
  const ahora = 1_700_000_000_000;
  const paso = pasoDe(ahora);

  it('acepta el código del período actual y devuelve SU período', () => {
    // Devuelve el período, no un booleano: es lo que permite rechazar la reutilización.
    expect(comprobar(SECRETO_RFC, codigoDe(SECRETO_RFC, paso), { ahora })).toBe(paso);
  });

  it('tolera un reloj desfasado, hacia atrás y hacia delante', () => {
    // Sin tolerancia, un teléfono veinte segundos desfasado —lo normal— hace fallar
    // códigos correctos, y la gente acaba desactivando el segundo factor.
    expect(comprobar(SECRETO_RFC, codigoDe(SECRETO_RFC, paso - 1), { ahora })).toBe(paso - 1);
    expect(comprobar(SECRETO_RFC, codigoDe(SECRETO_RFC, paso + 1), { ahora })).toBe(paso + 1);
  });

  it('NO tolera dos ventanas: la del código robado no se estira', () => {
    expect(comprobar(SECRETO_RFC, codigoDe(SECRETO_RFC, paso - 2), { ahora })).toBeNull();
  });

  it('un código ya usado no vuelve a valer, ni dentro de su ventana', () => {
    // El motivo: quien mira por encima del hombro tiene treinta segundos para usarlo.
    const codigo = codigoDe(SECRETO_RFC, paso);
    expect(comprobar(SECRETO_RFC, codigo, { ahora })).toBe(paso);
    expect(comprobar(SECRETO_RFC, codigo, { ahora, ultimoPaso: paso })).toBeNull();
  });

  it('rechaza lo que no es un código', () => {
    for (const malo of ['', '12345', '1234567', 'abcdef', null, undefined, 123456])
      expect(comprobar(SECRETO_RFC, malo, { ahora })).toBeNull();
  });

  it('limpia separadores: la gente teclea «123 456»', () => {
    const c = codigoDe(SECRETO_RFC, paso);
    expect(comprobar(SECRETO_RFC, `${c.slice(0, 3)} ${c.slice(3)}`, { ahora })).toBe(paso);
  });

  it('un secreto distinto no vale', () => {
    expect(comprobar(secretoNuevo(), codigoDe(SECRETO_RFC, paso), { ahora })).toBeNull();
  });
});

describe('la URI del código QR', () => {
  it('lleva lo que la aplicación necesita', () => {
    const u = new URL(uriDeAutenticacion({ emisor: 'Acme', cuenta: 'ana@acme.com', secreto: SECRETO_RFC }));
    expect(u.protocol).toBe('otpauth:');
    expect(u.searchParams.get('secret')).toBe(SECRETO_RFC);
    expect(u.searchParams.get('issuer')).toBe('Acme');
  });
  it('escapa un emisor con dos puntos, que partiría la URI', () => {
    // Un nombre de empresa con «:» es legal, y sin escapar la aplicación mostraría
    // una cuenta con otro nombre.
    const u = uriDeAutenticacion({ emisor: 'A:B', cuenta: 'ana', secreto: SECRETO_RFC });
    expect(u).toContain('A%3AB');
  });
});

describe('códigos de respaldo', () => {
  it('se generan distintos y en cantidad', () => {
    const r = respaldosNuevos();
    expect(r.length).toBeGreaterThanOrEqual(8);
    expect(new Set(r).size).toBe(r.length);
  });
  it('se normalizan para poder compararlos como los teclea la gente', () => {
    const [uno] = respaldosNuevos();
    expect(normalizarRespaldo(uno.toLowerCase())).toBe(normalizarRespaldo(uno));
    expect(normalizarRespaldo(` ${uno} `)).toBe(normalizarRespaldo(uno));
  });
});
