/**
 * El CONTRATO del puerto, probado contra TODOS los adaptadores.
 *
 * Es la pieza que impide el «funciona en local y no en la nube»: un adaptador nuevo está
 * bien el día que pasa estas pruebas, y no antes. Escribir tests distintos para cada
 * implementación garantiza que se comporten distinto.
 *
 * Para añadir un adaptador: una línea en `ADAPTADORES`.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Almacen, ErrorDeAlmacen } from './almacen';
import { AlmacenEnMemoria } from './almacen.memoria';
import { AlmacenLocal } from './almacen.local';

const temporales: string[] = [];
const ADAPTADORES: [string, () => Promise<Almacen>][] = [
  ['memoria', async () => new AlmacenEnMemoria()],
  ['local',   async () => { const d = await mkdtemp(join(tmpdir(), 'almacen-')); temporales.push(d); return new AlmacenLocal(d); }],
  // ['s3', async () => new AlmacenS3(...)],   ← el adaptador nuevo entra aquí, y ya
];

afterAll(async () => { for (const d of temporales) await rm(d, { recursive: true, force: true }); });

describe.each(ADAPTADORES)('contrato de Almacen · %s', (_nombre, crear) => {
  let a: Almacen;
  beforeEach(async () => { a = await crear(); });

  it('guarda y lee texto', async () => {
    await a.guardar('carpeta/uno.txt', 'hola');
    expect(await a.leerTexto('carpeta/uno.txt')).toBe('hola');
  });

  it('guarda y lee binario sin alterarlo', async () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    await a.guardar('bin/datos', bytes);
    expect(Array.from(await a.leer('bin/datos'))).toEqual(Array.from(bytes));
  });

  it('sobrescribe', async () => {
    await a.guardar('x', 'primero');
    await a.guardar('x', 'segundo');
    expect(await a.leerTexto('x')).toBe('segundo');
  });

  it('existe distingue lo que hay de lo que no', async () => {
    await a.guardar('hay', 'sí');
    expect(await a.existe('hay')).toBe(true);
    expect(await a.existe('no-hay')).toBe(false);
  });

  it('leer lo que no existe lanza un error DEL DOMINIO', async () => {
    // La prueba que importa: ningún error del proveedor debe cruzar la frontera. Si aquí
    // llegara un `NoSuchKey` de S3, la aplicación acabaría capturando errores de AWS.
    await expect(a.leer('fantasma')).rejects.toBeInstanceOf(ErrorDeAlmacen);
    await expect(a.leer('fantasma')).rejects.toMatchObject({ causa: 'no-existe' });
  });

  it('listar filtra por prefijo y devuelve orden estable', async () => {
    await a.guardar('a/1', '1'); await a.guardar('a/2', '2'); await a.guardar('b/1', '3');
    expect(await a.listar('a/')).toEqual(['a/1', 'a/2']);
    expect((await a.listar()).length).toBe(3);
  });

  it('borrar es idempotente', async () => {
    await a.guardar('temporal', 'x');
    await a.borrar('temporal');
    expect(await a.existe('temporal')).toBe(false);
    // La segunda vez no puede fallar: si no, el reintento de una limpieza se rompe.
    await expect(a.borrar('temporal')).resolves.toBeUndefined();
  });

  it('el enlace temporal falla si el objeto no existe', async () => {
    await expect(a.enlaceTemporal('fantasma', 60)).rejects.toBeInstanceOf(ErrorDeAlmacen);
    await a.guardar('real', 'x');
    expect(typeof await a.enlaceTemporal('real', 60)).toBe('string');
  });
});
