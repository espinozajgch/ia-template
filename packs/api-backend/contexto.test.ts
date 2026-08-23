import { describe, it, expect, vi } from 'vitest';
import { conContexto, contextoActual, clienteConContexto, almacen } from './contexto';

const base = {
  nombre: 'base',
  consultar: vi.fn(() => 'del base'),
  soloEnBase: () => 'exclusivo',
};

describe('contexto por cadena de ejecución', () => {
  it('lo ve lo que se llame por hondo que esté', () => {
    const hondo = () => contextoActual()?.clienteId;
    const medio = () => hondo();
    conContexto({ db: {}, clienteId: 7 }, () => expect(medio()).toBe(7));
  });

  it('fuera del contexto no hay nada, no un valor de otro', () => {
    expect(contextoActual()).toBeUndefined();
  });

  it('dos cadenas concurrentes NO se pisan', async () => {
    // Es el fallo que tiene una variable global, y el motivo de todo esto.
    const leer = (ms: number) => new Promise<unknown>(r =>
      setTimeout(() => r(contextoActual()?.clienteId), ms));
    const [a, b] = await Promise.all([
      new Promise(r => conContexto({ db: {}, clienteId: 'A' }, () => r(leer(20)))),
      new Promise(r => conContexto({ db: {}, clienteId: 'B' }, () => r(leer(5)))),
    ]);
    expect(await a).toBe('A');
    expect(await b).toBe('B');
  });
});

describe('cliente con contexto', () => {
  const db = clienteConContexto(base);

  it('SIN contexto preserva la identidad de los métodos', () => {
    // La regla que salva la suite de tests: si se ligara siempre, esto daría falso y
    // ningún espía volvería a reconocer el método.
    expect(db.consultar).toBe(base.consultar);
    expect(db.nombre).toBe('base');
    expect(db.consultar()).toBe('del base');
  });

  it('CON contexto enruta al cliente de la petición', () => {
    const dePeticion = { nombre: 'peticion', consultar: () => 'de la peticion' };
    conContexto({ db: dePeticion }, () => {
      expect(db.nombre).toBe('peticion');
      expect(db.consultar()).toBe('de la peticion');
    });
  });

  it('el método enrutado conserva su `this`', () => {
    const dePeticion = { marca: 'X', quienSoy() { return this.marca; } };
    conContexto({ db: dePeticion }, () => {
      const fn = (db as unknown as { quienSoy: () => string }).quienSoy;
      expect(fn()).toBe('X');   // desligado se rompería
    });
  });

  it('al salir del contexto vuelve al base', () => {
    conContexto({ db: { nombre: 'peticion' } }, () => expect(db.nombre).toBe('peticion'));
    expect(db.nombre).toBe('base');
  });

  it('un espía puesto sobre el base sigue funcionando fuera del contexto', () => {
    const espia = vi.spyOn(base, 'consultar').mockReturnValue('simulado');
    expect(db.consultar()).toBe('simulado');
    espia.mockRestore();
  });
});

describe('el almacén se expone para casos raros', () => {
  it('permite comprobar si hay contexto sin leerlo entero', () => {
    expect(almacen.getStore()).toBeUndefined();
    conContexto({ db: {} }, () => expect(almacen.getStore()).toBeDefined());
  });
});
