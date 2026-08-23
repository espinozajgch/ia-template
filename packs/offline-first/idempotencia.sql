-- La otra mitad de trabajar sin conexión: el servidor.
--
-- Una cola que reintenta va a reenviar cosas. Sin esto, el reintento de un cobro cobra dos
-- veces, y el de un alta crea dos fichas. La cola sola NO basta: es la mitad cliente de un
-- mecanismo que tiene dos.
--
-- Cómo funciona: cada mutación viaja con un identificador que el cliente genera y NO cambia
-- entre reintentos. La primera vez se guarda junto con la respuesta; las siguientes
-- devuelven esa respuesta guardada sin volver a ejecutar nada.
--
-- AJUSTAR: el esquema y la caducidad.

CREATE TABLE IF NOT EXISTS app.mutaciones (
  id_mutacion   text        PRIMARY KEY,
  -- Con varios clientes, el identificador solo es único dentro de su ámbito.
  ambito        text        NOT NULL DEFAULT 'global',
  ruta          text        NOT NULL,
  -- Huella del cuerpo: si llega el MISMO identificador con OTRO contenido, no es un
  -- reintento — es un error del cliente, y devolver la respuesta vieja lo escondería.
  huella_cuerpo text        NOT NULL,
  estado        integer     NOT NULL,
  respuesta     jsonb,
  creada_en     timestamptz NOT NULL DEFAULT now()
);

-- Las mutaciones viejas ya no las va a reintentar nadie: un cliente que vuelve tras un mes
-- sin red trae trabajo que conviene revisar a mano, no aplicar sin más.
CREATE INDEX IF NOT EXISTS idx_mutaciones_creada ON app.mutaciones (creada_en);

-- Se ejecuta ANTES de hacer el trabajo, dentro de la misma transacción.
--   · devuelve la respuesta guardada  → era un reintento, no se hace nada
--   · devuelve NULL                   → es nueva, sigue adelante
--   · lanza excepción                 → mismo identificador con otro cuerpo
CREATE OR REPLACE FUNCTION app.reservar_mutacion(
  p_id text, p_ambito text, p_ruta text, p_huella text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_previa app.mutaciones%ROWTYPE;
BEGIN
  SELECT * INTO v_previa FROM app.mutaciones WHERE id_mutacion = p_id AND ambito = p_ambito;

  IF FOUND THEN
    IF v_previa.huella_cuerpo <> p_huella THEN
      RAISE EXCEPTION 'la mutación % ya existe con otro contenido', p_id
        USING ERRCODE = '23505';
    END IF;
    -- Reintento legítimo: la respuesta de la primera vez.
    RETURN coalesce(v_previa.respuesta, '{"reintento":true}'::jsonb);
  END IF;

  INSERT INTO app.mutaciones (id_mutacion, ambito, ruta, huella_cuerpo, estado)
  VALUES (p_id, p_ambito, p_ruta, p_huella, 0);
  RETURN NULL;   -- es nueva: adelante
END $$;

-- Se llama al terminar, con el resultado, en la misma transacción.
-- `integer` y no `smallint` a propósito: con smallint, llamar con un literal como 201
-- da «function does not exist», que manda a buscar un problema de permisos o de esquema
-- donde solo faltaba un cast.
CREATE OR REPLACE FUNCTION app.completar_mutacion(
  p_id text, p_ambito text, p_estado integer, p_respuesta jsonb
) RETURNS void
LANGUAGE sql AS $$
  UPDATE app.mutaciones SET estado = p_estado, respuesta = p_respuesta
   WHERE id_mutacion = p_id AND ambito = p_ambito;
$$;

-- Limpieza. Que sea un trabajo programado y no un borrado al vuelo: si se ejecuta dentro
-- de la petición, la petición paga el coste de la limpieza de todos los demás.
--   DELETE FROM app.mutaciones WHERE creada_en < now() - interval '30 days';
