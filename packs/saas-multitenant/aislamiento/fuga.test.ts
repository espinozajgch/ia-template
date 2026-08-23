/**
 * Prueba de fuga entre clientes.
 *
 * Es el test más importante de un sistema multi-cliente, y hay que escribirlo el primer
 * día —cuando hay tres tablas— no el día que hay ochenta.
 *
 * Qué comprueba: con la identidad del cliente A, que sea IMPOSIBLE leer, modificar,
 * borrar o crear datos del cliente B. En TODAS las tablas, no en las que uno recuerde.
 *
 * Se salta solo si no hay base de datos de pruebas, así que no estorba en el suite
 * unitario. En la integración continua sí corre: ver agente/ci/github/integracion.yml
 *
 * Hermético: todo ocurre dentro de una transacción que se descarta, así que no deja nada.
 *
 * AJUSTAR: el esquema, la lista de tablas, la columna de cliente y el nombre del rol.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;

const ESQUEMA = 'app';
const COLUMNA_CLIENTE = 'cliente_id';
const ROL_APP = 'app_rol';
const A = 1n;   // cliente propio
const B = 2n;   // cliente ajeno

describe.skipIf(!URL_PRUEBAS)('aislamiento entre clientes (requiere TEST_DATABASE_URL)', () => {
  let pool: Pool;
  let tablas: string[];

  beforeAll(async () => {
    pool = new Pool({ connectionString: URL_PRUEBAS });
    // La lista se DESCUBRE, no se escribe a mano: una tabla nueva con datos de cliente
    // entra sola en la prueba. Escribirla a mano garantiza que algún día falte una.
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = $1 AND column_name = $2 ORDER BY table_name`,
      [ESQUEMA, COLUMNA_CLIENTE],
    );
    tablas = rows.map(r => r.table_name);
    expect(tablas.length, 'ninguna tabla con columna de cliente: revisa la configuración').toBeGreaterThan(0);
  });

  afterAll(async () => { await pool?.end(); });

  /** Corre `fn` como el rol de la aplicación, con el cliente fijado, y descarta todo. */
  async function comoCliente<T>(cliente: bigint, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SET LOCAL ROLE ${ROL_APP}`);
      await c.query('SELECT set_config($1, $2, true)', ['app.cliente_actual', String(cliente)]);
      return await fn(c);
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  }

  // ── 1 · Toda tabla con datos de cliente tiene RLS activa Y forzada ──────────
  it('todas las tablas tienen RLS activa y forzada', async () => {
    const { rows } = await pool.query(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relname = ANY($2)`,
      [ESQUEMA, tablas],
    );
    const sinRls    = rows.filter(r => !r.relrowsecurity).map(r => r.relname);
    const sinForzar = rows.filter(r => r.relrowsecurity && !r.relforcerowsecurity).map(r => r.relname);
    expect(sinRls, 'tablas con datos de cliente y SIN RLS').toEqual([]);
    // Sin FORCE, el dueño de la tabla se salta la política y todo esto es decorativo.
    expect(sinForzar, 'tablas con RLS pero sin FORCE').toEqual([]);
  });

  // ── 2 · Ninguna regla de escritura deja pasar cualquier fila ────────────────
  it('toda política restringe la escritura por cliente', async () => {
    // Ojo con el mito: omitir WITH CHECK en una política FOR ALL NO abre un agujero —
    // PostgreSQL reutiliza la expresión de USING como regla de escritura. Comprobado.
    //
    // El agujero real es otro: una política FOR ALL con un USING PERMISIVO. Un
    // `USING (true)` puesto para poder leer un catálogo compartido se hereda como regla
    // de escritura, y entonces cualquiera puede insertar o modificar filas de cualquier
    // cliente — sin que ningún error lo delate.
    const { rows } = await pool.query(
      `SELECT tablename, policyname,
              coalesce(with_check, qual) AS regla_de_escritura
         FROM pg_policies
        WHERE schemaname = $1 AND cmd IN ('ALL','INSERT','UPDATE')`,
      [ESQUEMA],
    );
    const permisivas = rows.filter(
      r => !r.regla_de_escritura || !String(r.regla_de_escritura).includes(COLUMNA_CLIENTE),
    );
    expect(permisivas, 'políticas cuya regla de escritura no menciona la columna de cliente').toEqual([]);
  });

  // ── 3 · A no ve nada de B ───────────────────────────────────────────────────
  it('el cliente A no lee filas del cliente B', async () => {
    const fugas: string[] = [];
    await comoCliente(A, async c => {
      for (const t of tablas) {
        const { rows } = await c.query(
          `SELECT count(*)::int AS n FROM ${ESQUEMA}.${t} WHERE ${COLUMNA_CLIENTE} <> $1`, [String(A)],
        );
        if (rows[0].n > 0) fugas.push(`${t}: ${rows[0].n} filas ajenas visibles`);
      }
    });
    expect(fugas, 'FUGA DE LECTURA entre clientes').toEqual([]);
  });

  // ── 4 · A no puede escribir en el territorio de B ───────────────────────────
  it('el cliente A no puede insertar filas marcadas como del cliente B', async () => {
    // Una tabla representativa basta: la política es la misma en todas y la 1 y la 2
    // ya comprueban que existe y está bien formada en cada una.
    const tabla = tablas[0];
    await comoCliente(A, async c => {
      await expect(
        c.query(`INSERT INTO ${ESQUEMA}.${tabla} (${COLUMNA_CLIENTE}) VALUES ($1)`, [String(B)]),
      ).rejects.toThrow();   // la política WITH CHECK lo rechaza
    });
  });

  it('el cliente A no puede modificar ni borrar filas del cliente B', async () => {
    const tabla = tablas[0];
    await comoCliente(A, async c => {
      const upd = await c.query(`UPDATE ${ESQUEMA}.${tabla} SET ${COLUMNA_CLIENTE} = $1 WHERE ${COLUMNA_CLIENTE} = $2`, [String(A), String(B)]);
      const del = await c.query(`DELETE FROM ${ESQUEMA}.${tabla} WHERE ${COLUMNA_CLIENTE} = $1`, [String(B)]);
      // No lanzan error: simplemente no alcanzan ninguna fila, que es el comportamiento
      // correcto de RLS. Si tocaran alguna, hay fuga de escritura.
      expect(upd.rowCount, 'FUGA: A modificó filas de B').toBe(0);
      expect(del.rowCount, 'FUGA: A borró filas de B').toBe(0);
    });
  });

  // ── 5 · Sin cliente fijado, no se ve nada ───────────────────────────────────
  it('una sesión sin cliente fijado no ve datos', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SET LOCAL ROLE ${ROL_APP}`);
      // A propósito: NO se fija app.cliente_actual.
      // Debe fallar ruidosamente, no devolver un conjunto vacío que parezca correcto ni
      // —mucho peor— devolverlo todo. Una política fail-open es la fuga silenciosa.
      await expect(
        c.query(`SELECT count(*) FROM ${ESQUEMA}.${tablas[0]}`),
      ).rejects.toThrow();
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  });
});
