import { describe, it, expect } from 'vitest';
import {
  ordenarPorPrioridad, tieneSinLeer, puedeTransicionar, motivoDeRechazo,
  admiteMensajes, estadoTrasMensaje, resumir, PESO, type Ticket,
} from './soporte';

const t = (p: Parameters<typeof Object.assign>[1] & Partial<Ticket>): Ticket => ({
  id: 1, clienteId: 'A', estado: 'abierto', prioridad: 'normal',
  ultimoMensajeDe: 'cliente', ultimoMensajeEn: new Date('2026-08-23T10:00:00Z'),
  creadoEn: new Date('2026-08-23T09:00:00Z'), ...p,
});

describe('orden por prioridad de NEGOCIO', () => {
  it('«alta» va por encima de «baja», que alfabéticamente sería al revés', () => {
    // El fallo real: ordenar la columna de texto en la base devolvía «alta» debajo de
    // «baja», y la cola salía invertida justo en lo que más importa.
    expect(PESO.alta).toBeGreaterThan(PESO.baja);
    const orden = ordenarPorPrioridad([
      t({ id: 1, prioridad: 'baja' }), t({ id: 2, prioridad: 'urgente' }),
      t({ id: 3, prioridad: 'alta' }), t({ id: 4, prioridad: 'normal' }),
    ]).map(x => x.id);
    expect(orden).toEqual([2, 3, 4, 1]);
  });
  it('con la misma prioridad, primero el que lleva más esperando', () => {
    const orden = ordenarPorPrioridad([
      t({ id: 1, ultimoMensajeEn: new Date('2026-08-23T10:00:00Z') }),
      t({ id: 2, ultimoMensajeEn: new Date('2026-08-23T12:00:00Z') }),
    ]).map(x => x.id);
    expect(orden).toEqual([2, 1]);
  });
  it('no muta el array de entrada', () => {
    const orig = [t({ id: 1, prioridad: 'baja' }), t({ id: 2, prioridad: 'urgente' })];
    ordenarPorPrioridad(orig);
    expect(orig.map(x => x.id)).toEqual([1, 2]);
  });
});

describe('no leído, por lado', () => {
  const cuando = new Date('2026-08-23T10:00:00Z');
  it('lo que uno escribe nunca está sin leer para uno mismo', () => {
    expect(tieneSinLeer('soporte', null, cuando, 'soporte')).toBe(false);
  });
  it('sin marca de visto, está sin leer', () => {
    expect(tieneSinLeer('cliente', null, cuando, 'soporte')).toBe(true);
  });
  it('visto antes del mensaje: sigue sin leer', () => {
    expect(tieneSinLeer('cliente', new Date('2026-08-23T09:00:00Z'), cuando, 'soporte')).toBe(true);
  });
  it('visto después: leído', () => {
    expect(tieneSinLeer('cliente', new Date('2026-08-23T11:00:00Z'), cuando, 'soporte')).toBe(false);
  });
  it('las marcas de los dos lados son INDEPENDIENTES', () => {
    // Con una sola marca, abrir el ticket desde soporte marcaría como leído lo que el
    // cliente no ha visto, y el cliente dejaría de recibir el aviso.
    const visto = new Date('2026-08-23T11:00:00Z');
    expect(tieneSinLeer('soporte', visto, cuando, 'cliente')).toBe(false);   // el cliente ya lo vio
    expect(tieneSinLeer('soporte', null, cuando, 'cliente')).toBe(true);     // no lo ha visto
  });
});

describe('transiciones', () => {
  it('soporte mueve un abierto a en progreso', () => {
    expect(puedeTransicionar('abierto', 'en_progreso', 'soporte')).toBe(true);
  });
  it('el cliente NO mueve un abierto a resuelto por su cuenta', () => {
    expect(puedeTransicionar('abierto', 'resuelto', 'cliente')).toBe(false);
    expect(motivoDeRechazo('abierto', 'resuelto', 'cliente')).toMatch(/no puede llevar/);
  });
  it('el cliente SÍ puede reabrir uno que espera su respuesta', () => {
    // Es lo que evita que un «resuelto» prematuro obligue a abrir otro ticket y se
    // pierda el hilo.
    expect(puedeTransicionar('esperando_cliente', 'en_progreso', 'cliente')).toBe(true);
    expect(puedeTransicionar('resuelto', 'en_progreso', 'cliente')).toBe(true);
  });
  it('cerrado es terminal, para los dos lados', () => {
    for (const lado of ['cliente', 'soporte'] as const)
      expect(puedeTransicionar('cerrado', 'en_progreso', lado)).toBe(false);
    expect(motivoDeRechazo('cerrado', 'abierto', 'soporte')).toMatch(/no se reabre/);
  });
  it('un ticket cerrado no admite mensajes', () => {
    expect(admiteMensajes('cerrado')).toBe(false);
    expect(admiteMensajes('resuelto')).toBe(true);
  });
});

describe('estado tras un mensaje', () => {
  it('si contesta el cliente a algo que le esperaba, vuelve a nuestro tejado', () => {
    expect(estadoTrasMensaje('esperando_cliente', 'cliente')).toBe('en_progreso');
  });
  it('si el cliente responde a un resuelto, se reabre', () => {
    expect(estadoTrasMensaje('resuelto', 'cliente')).toBe('en_progreso');
  });
  it('si contesta soporte a uno abierto, pasa a en progreso', () => {
    expect(estadoTrasMensaje('abierto', 'soporte')).toBe('en_progreso');
  });
  it('un cerrado no cambia', () => {
    expect(estadoTrasMensaje('cerrado', 'cliente')).toBe('cerrado');
  });
});

describe('resumen de la cola', () => {
  const ahora = new Date('2026-08-23T18:00:00Z');

  it('«esperando cliente» NO cuenta como nuestro', () => {
    // Es lo que hace que el número signifique algo: sin separarlo, el equipo parece
    // retrasado por tickets que dependen de una respuesta que no controla.
    const r = resumir([
      t({ id: 1, estado: 'abierto', ultimoMensajeDe: 'cliente' }),
      t({ id: 2, estado: 'esperando_cliente', ultimoMensajeDe: 'soporte' }),
      t({ id: 3, estado: 'en_progreso', ultimoMensajeDe: 'cliente' }),
    ], ahora);
    expect(r.enNuestroTejado).toBe(2);
    expect(r.total).toBe(3);
  });

  it('un abierto donde el último en hablar fuimos nosotros tampoco cuenta', () => {
    const r = resumir([t({ estado: 'abierto', ultimoMensajeDe: 'soporte' })], ahora);
    expect(r.enNuestroTejado).toBe(0);
  });

  it('cuenta por estado', () => {
    const r = resumir([t({ estado: 'abierto' }), t({ estado: 'abierto' }), t({ estado: 'cerrado' })], ahora);
    expect(r.porEstado.abierto).toBe(2);
    expect(r.porEstado.cerrado).toBe(1);
    expect(r.porEstado.resuelto).toBe(0);
  });

  it('mide la espera más larga, que es lo que duele al cliente', () => {
    const r = resumir([
      t({ id: 1, ultimoMensajeEn: new Date('2026-08-23T16:00:00Z') }),
      t({ id: 2, ultimoMensajeEn: new Date('2026-08-23T09:00:00Z') }),
    ], ahora);
    expect(r.esperaMasLargaHoras).toBe(9);
  });

  it('sin nada esperándonos, la espera es nula, no cero', () => {
    // Cero horas y «nada esperando» son cosas distintas, y en un panel se leen distinto.
    const r = resumir([t({ estado: 'cerrado' })], ahora);
    expect(r.esperaMasLargaHoras).toBeNull();
  });

  it('cuenta los que soporte no ha leído', () => {
    const r = resumir([
      t({ id: 1, ultimoMensajeDe: 'cliente', vistoPorSoporteEn: null }),
      t({ id: 2, ultimoMensajeDe: 'cliente', vistoPorSoporteEn: new Date('2026-08-23T11:00:00Z') }),
      t({ id: 3, ultimoMensajeDe: 'soporte', vistoPorSoporteEn: null }),
    ], ahora);
    expect(r.sinLeerPorSoporte).toBe(1);
  });

  it('con la cola vacía no revienta', () => {
    const r = resumir([], ahora);
    expect(r.total).toBe(0);
    expect(r.enNuestroTejado).toBe(0);
    expect(r.esperaMasLargaHoras).toBeNull();
  });
});
