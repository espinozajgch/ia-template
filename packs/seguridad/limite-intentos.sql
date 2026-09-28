-- limite-intentos.sql — el contador de intentos de acceso, en PostgreSQL. Idempotente.
--
-- ⚠️ EJEMPLO REAL DE OTROS PROYECTOS: sale de Pulso (db/migrations/009_intentos_de_acceso.sql),
-- con la clave guardada como huella (Logroño United) y el exponente acotado antes de
-- elevar. Cambia `app_rol` por el rol con el que se conecta tu aplicación. La decisión de
-- si se permite un intento vive en `limite-intentos.ts` (`veredicto`), no aquí.
--
-- Por qué en la base y no en la memoria del proceso: reiniciar borraba los bloqueos en
-- curso y, con varias réplicas, cada una llevaba su cuenta —el límite efectivo se
-- multiplicaba por el número de instancias—. Por qué atómico: leer, decidir y escribir
-- desde el proceso deja que dos peticiones simultáneas contra la misma cuenta sumen uno.

CREATE TABLE IF NOT EXISTS intentos_de_acceso (
  clave            CHAR(64)    PRIMARY KEY,   -- huella SHA-256: ningún correo en claro
  intentos         INTEGER     NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  desde            TIMESTAMPTZ NOT NULL,
  bloqueado_hasta  TIMESTAMPTZ
);

-- La poda recorre por antigüedad, nunca por clave.
CREATE INDEX IF NOT EXISTS intentos_de_acceso_desde_idx ON intentos_de_acceso (desde);

REVOKE ALL ON intentos_de_acceso FROM PUBLIC;
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON intentos_de_acceso TO app_rol;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'el rol app_rol no existe todavía: concédele SELECT, INSERT, UPDATE y DELETE al crearlo';
END $$;

/*
 * Registra un fallo y, si pasa del máximo, bloquea: base · 2^(sobrantes), con techo.
 * Fuera de la ventana el historial ya no dice nada y se empieza de cero. Poda de paso
 * las filas cuya ventana venció hace rato y que ya no bloquean a nadie.
 */
CREATE OR REPLACE FUNCTION registrar_fallo_de_acceso(
  p_clave   CHAR(64),
  p_maximo  INTEGER,
  p_ahora   TIMESTAMPTZ,
  p_ventana INTERVAL,
  p_base    INTERVAL DEFAULT INTERVAL '1 minute',
  p_techo   INTERVAL DEFAULT INTERVAL '1 hour'
) RETURNS TIMESTAMPTZ   -- hasta cuándo queda bloqueada la clave, o NULL
LANGUAGE plpgsql AS $$
DECLARE
  v_intentos INTEGER;
  v_pasos    INTEGER;
  v_hasta    TIMESTAMPTZ;
BEGIN
  INSERT INTO intentos_de_acceso (clave, intentos, desde, bloqueado_hasta)
  VALUES (p_clave, 1, p_ahora, NULL)
  ON CONFLICT (clave) DO UPDATE SET
    intentos = CASE WHEN intentos_de_acceso.desde <= p_ahora - p_ventana
                    THEN 1 ELSE intentos_de_acceso.intentos + 1 END,
    desde    = CASE WHEN intentos_de_acceso.desde <= p_ahora - p_ventana
                    THEN p_ahora ELSE intentos_de_acceso.desde END,
    bloqueado_hasta = NULL
  RETURNING intentos INTO v_intentos;

  IF v_intentos >= p_maximo THEN
    -- El exponente se acota ANTES de elevar: sin esto, suficientes fallos desbordan.
    v_pasos := CEIL(LOG(2, EXTRACT(EPOCH FROM p_techo) / EXTRACT(EPOCH FROM p_base)));
    v_hasta := p_ahora + LEAST(p_techo, p_base * POWER(2, LEAST(v_intentos - p_maximo, v_pasos)));
    UPDATE intentos_de_acceso SET bloqueado_hasta = v_hasta WHERE clave = p_clave;
  END IF;

  DELETE FROM intentos_de_acceso
   WHERE desde < p_ahora - (p_ventana * 4)
     AND (bloqueado_hasta IS NULL OR bloqueado_hasta < p_ahora);

  RETURN v_hasta;
END $$;

-- Un acierto limpia la clave de ESA cuenta. La de la IP no: si de veinte intentos uno
-- acierta, los otros diecinueve siguen siendo lo que eran.
--   DELETE FROM intentos_de_acceso WHERE clave = $1;
-- Levantar el bloqueo de una cuenta sin tocar su contraseña (la administración) es la
-- misma orden. Sin esa salida, fallar cinco veces por ventana con el correo de alguien
-- lo deja fuera indefinidamente, y la única forma de devolverle el acceso sería
-- restablecer su contraseña, que además le entrega la cuenta a quien lo hace.
