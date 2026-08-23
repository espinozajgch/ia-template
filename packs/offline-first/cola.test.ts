import { describe, it, expect, beforeEach } from 'vitest';
import {
  crearCola, puedeEncolarse, referenciaProvisional, esProvisional,
  resolverReferencias, tieneProvisionalesSinResolver, PROVISIONAL,
  type Entrada, type Almacen, type ResultadoEnvio,
} from './cola';

const LISTA = { '/api/pacientes': ['crear', 'actualizar'], '/api/notas': ['crear'] } as const;

function almacenEnMemoria(): Almacen & { ver: () => Entrada[] } {
  let datos: Entrada[] = [];
  return {
    async leer() { return datos.map(e => ({ ...e })); },
    async escribir(e) { datos = e.map(x => ({ ...x })); },
    ver: () => datos,
  };
}

describe('lista blanca', () => {
  it('deja pasar lo declarado', () => expect(puedeEncolarse(LISTA, '/api/pacientes', 'crear')).toBe(true));
  it('rechaza lo no declarado', () => {
    expect(puedeEncolarse(LISTA, '/api/pacientes', 'borrar')).toBe(false);
    expect(puedeEncolarse(LISTA, '/api/facturas', 'crear')).toBe(false);   // consume correlativo
  });
  it('encolar algo no declarado lanza error, no lo encola callando', async () => {
    const c = crearCola(almacenEnMemoria(), LISTA);
    await expect(c.encolar('/api/facturas', 'crear', {})).rejects.toThrow(/no está declarada/);
  });
});

describe('referencias provisionales', () => {
  it('son texto, imposible de confundir con un identificador', () => {
    const r = referenciaProvisional();
    expect(r.startsWith(PROVISIONAL)).toBe(true);
    expect(esProvisional(r)).toBe(true);
    // Lo que importa: si se cuela al servidor, un validador de enteros la rechaza.
    expect(Number.isInteger(Number(r))).toBe(false);
    expect(esProvisional(-1)).toBe(false);
    expect(esProvisional(0)).toBe(false);
  });
  it('se resuelven en profundidad', () => {
    const ref = 'tmp:abc';
    const mapa = new Map<string, string | number>([[ref, 42]]);
    expect(resolverReferencias({ a: { b: [ref, 'x'] } }, mapa)).toEqual({ a: { b: [42, 'x'] } });
  });
  it('se detecta lo que queda sin resolver', () => {
    expect(tieneProvisionalesSinResolver({ a: [{ b: 'tmp:x' }] })).toBe(true);
    expect(tieneProvisionalesSinResolver({ a: [{ b: 1 }] })).toBe(false);
  });
});

describe('vaciado en orden', () => {
  let alm: ReturnType<typeof almacenEnMemoria>;
  beforeEach(() => { alm = almacenEnMemoria(); });

  it('envía en el orden en que se capturó', async () => {
    const c = crearCola(alm, LISTA);
    await c.encolar('/api/pacientes', 'crear', { n: 1 });
    await c.encolar('/api/pacientes', 'crear', { n: 2 });
    await c.encolar('/api/notas', 'crear', { n: 3 });

    const vistos: unknown[] = [];
    const r = await c.vaciar(async e => { vistos.push((e.cuerpo as { n: number }).n); return { tipo: 'aplicada' }; });
    expect(vistos).toEqual([1, 2, 3]);
    expect(r.aplicadas).toBe(3);
  });

  it('una rechazada DETIENE lo que va detrás, no lo salta', async () => {
    const c = crearCola(alm, LISTA);
    await c.encolar('/api/pacientes', 'crear', { n: 1 });      // se rechaza
    await c.encolar('/api/pacientes', 'actualizar', { n: 2 }); // corrige a la anterior
    await c.encolar('/api/notas', 'crear', { n: 3 });

    const enviados: number[] = [];
    const r = await c.vaciar(async e => {
      const n = (e.cuerpo as { n: number }).n;
      enviados.push(n);
      return n === 1 ? { tipo: 'rechazada', error: 'datos inválidos' } : { tipo: 'aplicada' };
    });

    // La 2 corrige un alta que nunca entró: enviarla sería aplicar sobre nada.
    expect(enviados).toEqual([1]);
    expect(r.rechazadas).toBe(1);
    expect(r.detenidas).toBe(2);
    expect(r.aplicadas).toBe(0);
  });

  it('un fallo temporal deja la cola pendiente, sin adelantar a nadie', async () => {
    const c = crearCola(alm, LISTA);
    await c.encolar('/api/pacientes', 'crear', { n: 1 });
    await c.encolar('/api/notas', 'crear', { n: 2 });
    const r = await c.vaciar(async () => ({ tipo: 'reintentar', error: 'sin red' }));
    expect(r.aplicadas).toBe(0);
    expect(r.pendientes).toBe(1);
    expect(r.detenidas).toBe(1);
  });

  it('resuelve la referencia provisional con el identificador real del servidor', async () => {
    const c = crearCola(alm, LISTA);
    const alta = await c.encolar('/api/pacientes', 'crear', { nombre: 'Ana' });
    await c.encolar('/api/notas', 'crear', { pacienteId: PROVISIONAL + alta.idMutacion, texto: 'x' });

    const cuerpos: unknown[] = [];
    await c.vaciar(async e => {
      cuerpos.push(e.cuerpo);
      return e.ruta === '/api/pacientes' ? { tipo: 'aplicada', idReal: 777 } : { tipo: 'aplicada' };
    });
    expect(cuerpos[1]).toEqual({ pacienteId: 777, texto: 'x' });
  });

  it('si la referencia no se resolvió, la entrada se detiene en vez de salir rota', async () => {
    const c = crearCola(alm, LISTA);
    await c.encolar('/api/notas', 'crear', { pacienteId: 'tmp:inexistente' });
    const r = await c.vaciar(async () => ({ tipo: 'aplicada' }));
    expect(r.aplicadas).toBe(0);
    expect(r.detenidas).toBe(1);
  });

  it('cada entrada lleva su identificador de mutación, para no aplicarse dos veces', async () => {
    const c = crearCola(alm, LISTA);
    await c.encolar('/api/pacientes', 'crear', { n: 1 });
    const ids: string[] = [];
    await c.vaciar(async e => { ids.push(e.idMutacion); return { tipo: 'reintentar', error: 'sin red' }; });
    await c.vaciar(async e => { ids.push(e.idMutacion); return { tipo: 'aplicada' }; });
    expect(ids[0]).toBe(ids[1]);   // el mismo en el reintento: el servidor puede descartarlo
  });
});

describe('gestión de la cola', () => {
  it('limpiar quita las aplicadas y conserva las rechazadas', async () => {
    const alm = almacenEnMemoria();
    const c = crearCola(alm, LISTA);
    await c.encolar('/api/pacientes', 'crear', { n: 1 });
    await c.encolar('/api/notas', 'crear', { n: 2 });
    await c.vaciar(async e => ((e.cuerpo as { n: number }).n === 1 ? { tipo: 'aplicada' } : { tipo: 'rechazada', error: 'x' }));
    await c.limpiar();
    const quedan = await c.pendientes();
    expect(alm.ver().filter(e => e.estado === 'aplicada')).toHaveLength(0);
    expect(alm.ver().filter(e => e.estado === 'rechazada')).toHaveLength(1);
    expect(quedan).toHaveLength(0);
  });

  it('descartar una rechazada libera las detenidas', async () => {
    const alm = almacenEnMemoria();
    const c = crearCola(alm, LISTA);
    const mala = await c.encolar('/api/pacientes', 'crear', { n: 1 });
    await c.encolar('/api/notas', 'crear', { n: 2 });
    await c.vaciar(async e => ((e.cuerpo as { n: number }).n === 1 ? { tipo: 'rechazada', error: 'x' } : { tipo: 'aplicada' }));
    expect((await c.pendientes()).filter(e => e.estado === 'detenida')).toHaveLength(1);

    await c.descartar(mala.idMutacion);          // decisión de una persona
    const r = await c.vaciar(async () => ({ tipo: 'aplicada' }));
    expect(r.aplicadas).toBe(1);
  });
});
