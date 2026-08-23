/**
 * Plantilla de test de integración: el SQL REAL contra una base REAL.
 *
 * ── Por qué hace falta, si ya hay tests de ruta ──────────────────────────────
 *
 * Los tests de ruta simulan la base entera. Eso está bien —son rápidos y prueban la
 * lógica— pero significa que **el SQL que arma el ORM no se ejecuta nunca**. Y ahí es
 * donde viven una familia entera de fallos que ningún otro test ve:
 *
 *   · un `= ANY($1)` sobre un array que en realidad necesitaba otro operador
 *   · un join que multiplica filas y devuelve el triple de resultados
 *   · un `COALESCE` que no cubre el NULL que sí llega
 *   · una política de aislamiento que no filtra lo que se creía
 *   · un índice que no se usa porque el tipo no coincide
 *
 * Todos pasan la revisión de código y todos aparecen en producción.
 *
 * ── Las dos propiedades que lo hacen viable ──────────────────────────────────
 *
 * **Se salta solo.** Sin `TEST_DATABASE_URL` no corre, así que la suite unitaria de
 * cualquiera sigue siendo rápida y no exige tener una base levantada.
 *
 * **Es hermético.** Cada caso corre dentro de una transacción que se DESCARTA. No deja
 * basura, no depende del orden y se puede correr mil veces. Sin esto, el primer caso que
 * inserta una fila con clave única rompe todos los siguientes.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { randomBytes } from 'node:crypto';
import { conContexto } from './contexto';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;

// Prefijo único por corrida: cinturón y tirantes junto al ROLLBACK. Si alguna vez algo
// escapa a la transacción —un trigger que escribe en otra tabla, un `COMMIT` colado— se
// puede identificar y limpiar en vez de contaminar en silencio.
const MARCA = `it_${randomBytes(4).toString('hex')}_`;

describe.skipIf(!URL_PRUEBAS)('repositorio · SQL real (requiere TEST_DATABASE_URL)', () => {
  let pool: Pool;
  let cliente: PoolClient;

  beforeAll(() => { pool = new Pool({ connectionString: URL_PRUEBAS }); });
  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    cliente = await pool.connect();
    await cliente.query('BEGIN');
  });

  afterEach(async () => {
    // ROLLBACK y no DELETE: más rápido, más completo, y no deja que un trigger
    // se dispare. Un `DELETE` de limpieza puede activar el soft-delete y dejar la
    // fila ocupando su clave única.
    await cliente.query('ROLLBACK').catch(() => {});
    cliente.release();
  });

  /** Corre el código real con el `db` atado a ESTA transacción. */
  const enLaTransaccion = <T>(fn: () => Promise<T>) =>
    conContexto({ db: envolver(cliente) }, fn);

  // AJUSTAR: adapta el cliente crudo a lo que espere tu capa de datos.
  const envolver = (c: PoolClient) => c;

  it('AJUSTAR · la consulta devuelve lo que se sembró', async () => {
    await cliente.query(
      `INSERT INTO app.ejemplo (clave, nombre) VALUES ($1, $2)`,
      [MARCA + '1', 'Prueba'],
    );
    const filas = await enLaTransaccion(async () => {
      const r = await cliente.query(`SELECT * FROM app.ejemplo WHERE clave LIKE $1`, [MARCA + '%']);
      return r.rows;
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].nombre).toBe('Prueba');
  });

  it('AJUSTAR · un join no multiplica filas', async () => {
    // El fallo clásico que los simulacros no ven: la consulta «funciona» y devuelve
    // cada fila tantas veces como coincidencias tenga en la tabla unida.
    expect(true).toBe(true);
  });

  it('AJUSTAR · el filtro por array usa el operador correcto', async () => {
    expect(true).toBe(true);
  });

  it('nada persiste entre casos', async () => {
    const r = await cliente.query(`SELECT count(*)::int AS n FROM app.ejemplo WHERE clave LIKE $1`, [MARCA + '%']);
    // El caso anterior insertó una fila y la transacción se descartó: aquí no está.
    expect(r.rows[0].n).toBe(0);
  });
});
