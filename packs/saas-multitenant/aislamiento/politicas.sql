-- Aislamiento por cliente a nivel de fila.
--
-- Por qué en la base y no en la aplicación: un filtro que depende de que cada consulta se
-- acuerde de ponerlo va a fallar. Basta un endpoint nuevo escrito con prisa, un script de
-- mantenimiento o un informe. La base no se olvida nunca.
--
-- Idempotente a propósito (ver el pack base-de-datos): se puede reaplicar sin romper nada.
--
-- AJUSTAR: el esquema, la lista de tablas y el nombre y tipo de la columna de cliente.

-- ── 1 · El rol de la aplicación NO es el dueño de las tablas ──────────────────
-- Es la parte que más se olvida y la que decide si esto sirve de algo: RLS **no se
-- aplica al dueño de la tabla** salvo que se fuerce. Si la aplicación se conecta con el
-- rol propietario, las políticas están ahí y no filtran nada.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rol') THEN
    CREATE ROLE app_rol NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA app TO app_rol;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_rol;
-- Las secuencias necesitan permiso propio. Sin esto, cualquier INSERT en una tabla con
-- clave autoincremental falla con «permission denied for sequence» — un error que además
-- confunde, porque parece un problema de la política y no lo es.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_rol;
-- Y para las tablas y secuencias que se creen DESPUÉS de aplicar esto:
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rol;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO app_rol;

-- ── 2 · Las políticas, tabla por tabla ────────────────────────────────────────
DO $$
DECLARE
  t text;
  -- AJUSTAR: todas las tablas con datos de cliente. Una que falte es una fuga.
  tablas text[] := ARRAY['clientes', 'documentos', 'facturas', 'usuarios'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('app.' || t) IS NULL THEN CONTINUE; END IF;

    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE hace que la política se aplique TAMBIÉN al dueño de la tabla. Sin esto, una
    -- conexión con el rol propietario lo ve todo y las políticas son decorativas.
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS aislamiento_cliente ON app.%I', t);
    EXECUTE format($p$
      CREATE POLICY aislamiento_cliente ON app.%I
        FOR ALL
        -- USING gobierna lo que se LEE, y qué filas alcanzan UPDATE y DELETE
        USING       (cliente_id = current_setting('app.cliente_actual')::bigint)
        -- WITH CHECK gobierna la fila RESULTANTE de un INSERT o un UPDATE.
        -- Si se omite en una política FOR ALL, PostgreSQL reutiliza la expresión de
        -- USING, así que omitirlo aquí no sería un agujero. Se escribe igualmente por
        -- dos razones: deja explícito que la escritura está gobernada, y permite que
        -- las dos reglas diverjan el día que haga falta (por ejemplo, poder LEER un
        -- catálogo compartido y no poder escribirlo).
        WITH CHECK  (cliente_id = current_setting('app.cliente_actual')::bigint)
    $p$, t);
  END LOOP;
END $$;

-- ── 3 · Cómo la aplicación fija el cliente de la sesión ───────────────────────
--
--   BEGIN;
--     SELECT set_config('app.cliente_actual', $1, true);  -- true = solo esta transacción
--     ... las consultas ...
--   COMMIT;
--
-- El identificador sale del testigo de sesión, NUNCA del cuerpo de la petición: uno que
-- llega en el cuerpo es una escalada de privilegios esperando a ocurrir.
--
-- Con un pool de conexiones, `set_config(..., true)` es obligatorio: acotado a la
-- transacción, no se filtra a la siguiente petición que reutilice esa conexión.

-- ── 4 · Sin variable de sesión, no se ve nada ─────────────────────────────────
--
-- Fíjate en que arriba NO hay escapatoria del tipo:
--     current_setting('app.cliente_actual', true) IS NULL OR ...
--
-- Esa variante es cómoda —las migraciones y los scripts funcionan sin fijar nada— pero
-- es FAIL-OPEN: cualquier conexión que olvide fijar la variable lo ve TODO. Con la
-- versión de arriba, olvidarla produce un error inmediato y ruidoso, que es lo correcto.
--
-- Para los trabajos de mantenimiento que sí necesitan cruzar clientes, usa un rol
-- distinto con BYPASSRLS, explícito y auditado — no un agujero en la política.
