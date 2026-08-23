-- Bandeja de salida de mensajes: correo, notificaciones, webhooks.
--
-- Generalizado de una implementación real que envía correo por SES con reintentos, lista
-- de supresión alimentada por rebotes, y un panel que no filtra datos personales.
--
-- ── Por qué una bandeja y no enviar directamente ─────────────────────────────
--
-- Enviar dentro de la petición ata dos cosas que no deberían estar atadas: si el proveedor
-- tarda, la petición tarda; si el proveedor falla, la operación del usuario falla — cuando
-- el usuario solo quería guardar algo, y el correo era un efecto secundario.
--
-- Con bandeja, la petición ESCRIBE una fila y termina. Un worker envía aparte. Un
-- proveedor caído retrasa el correo, no rompe el producto.
--
-- AJUSTAR: el esquema, los canales y los tiempos de reintento.

CREATE TABLE IF NOT EXISTS app.mensajes (
  id                bigserial PRIMARY KEY,
  canal             text        NOT NULL DEFAULT 'email',   -- email | push | webhook | sms
  destinatario      text        NOT NULL,
  plantilla         text        NOT NULL,
  idioma            text        NOT NULL DEFAULT 'es',
  -- Los datos de la plantilla. Se guardan porque el mensaje puede enviarse mucho después
  -- de que la fila que lo originó haya cambiado: se manda lo que era verdad al encolarlo.
  datos             jsonb       NOT NULL DEFAULT '{}',

  estado            text        NOT NULL DEFAULT 'pendiente',  -- pendiente|procesando|enviado|fallido|suprimido
  intentos          integer     NOT NULL DEFAULT 0,
  proximo_intento   timestamptz NOT NULL DEFAULT now(),
  procesando_desde  timestamptz,
  ultimo_error      text,
  id_proveedor      text,                                   -- para cruzar con rebotes

  -- Evita el duplicado en origen: dos peticiones que encolan «bienvenida a este usuario»
  -- producen una sola fila.
  clave_unica       text,

  creado_en         timestamptz NOT NULL DEFAULT now(),
  enviado_en        timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mensajes_clave ON app.mensajes (clave_unica) WHERE clave_unica IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mensajes_cola ON app.mensajes (estado, proximo_intento) WHERE estado = 'pendiente';

-- ── Lista de supresión ───────────────────────────────────────────────────────
-- Direcciones a las que NO se vuelve a escribir: rebotes permanentes y quejas de abuso.
--
-- Es GLOBAL a propósito, no por cliente. Un buzón que no existe no existe para nadie, y
-- seguir escribiéndole desde otro cliente hunde la reputación de envío de todos.
CREATE TABLE IF NOT EXISTS app.supresiones (
  destinatario  text        PRIMARY KEY,
  motivo        text        NOT NULL,           -- rebote | queja | manual
  origen        text        NOT NULL,
  detalle       text,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

-- Idempotente: una dirección ya suprimida conserva su PRIMER motivo. El primero es el que
-- explica por qué, y sobrescribirlo con un «manual» posterior pierde esa información.
CREATE OR REPLACE FUNCTION app.suprimir(p_dest text, p_motivo text, p_origen text, p_detalle text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO app.supresiones (destinatario, motivo, origen, detalle)
  VALUES (lower(trim(p_dest)), p_motivo, p_origen, left(coalesce(p_detalle,''), 500))
  ON CONFLICT (destinatario) DO NOTHING;
$$;

-- ── Tomar trabajo ────────────────────────────────────────────────────────────
/*
 * Reclama hasta `p_limite` mensajes para ESTE worker.
 *
 * Dos piezas que hay que entender:
 *
 * · `FOR UPDATE SKIP LOCKED` — varios workers pueden tirar de la misma cola sin pisarse ni
 *   bloquearse. Sin él, o se serializan (lento) o se reparten el mismo mensaje (duplicado).
 *
 * · El `intentos` que devuelve es un TESTIGO DE VIGENCIA. Al terminar, el worker informa
 *   con ese valor; si otro worker ya reclamó el mensaje —porque este se quedó colgado y
 *   venció su plazo— el número ya no coincide y el informe se descarta. Sin esto, un
 *   worker rezagado marca como enviado un mensaje que otro está mandando ahora.
 */
CREATE OR REPLACE FUNCTION app.reclamar_mensajes(p_limite integer, p_canal text DEFAULT NULL)
RETURNS TABLE (id bigint, canal text, destinatario text, plantilla text, idioma text, datos jsonb, intentos integer)
LANGUAGE sql AS $$
  WITH elegidos AS (
    SELECT m.id FROM app.mensajes m
     WHERE m.estado = 'pendiente'
       AND m.proximo_intento <= now()
       AND (p_canal IS NULL OR m.canal = p_canal)
     ORDER BY m.proximo_intento
     LIMIT p_limite
     FOR UPDATE SKIP LOCKED
  )
  UPDATE app.mensajes m
     SET estado = 'procesando', procesando_desde = now(), intentos = m.intentos + 1
    FROM elegidos e
   WHERE m.id = e.id
  RETURNING m.id, m.canal, m.destinatario, m.plantilla, m.idioma, m.datos, m.intentos;
$$;

-- Informar del resultado. El testigo se comprueba: si no coincide, no se toca nada.
CREATE OR REPLACE FUNCTION app.mensaje_enviado(p_id bigint, p_testigo integer, p_id_proveedor text)
RETURNS boolean LANGUAGE sql AS $$
  WITH u AS (
    UPDATE app.mensajes SET estado='enviado', enviado_en=now(), procesando_desde=NULL, id_proveedor=p_id_proveedor
     WHERE id=p_id AND intentos=p_testigo RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

CREATE OR REPLACE FUNCTION app.mensaje_reintentar(p_id bigint, p_testigo integer, p_error text, p_espera interval)
RETURNS boolean LANGUAGE sql AS $$
  WITH u AS (
    UPDATE app.mensajes
       SET estado='pendiente', procesando_desde=NULL,
           proximo_intento = now() + p_espera,
           ultimo_error = left(p_error, 1000)
     WHERE id=p_id AND intentos=p_testigo RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

CREATE OR REPLACE FUNCTION app.mensaje_fallido(p_id bigint, p_testigo integer, p_error text)
RETURNS boolean LANGUAGE sql AS $$
  WITH u AS (
    UPDATE app.mensajes SET estado='fallido', procesando_desde=NULL, ultimo_error=left(p_error,1000)
     WHERE id=p_id AND intentos=p_testigo RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

-- ── Rescate ──────────────────────────────────────────────────────────────────
-- Un worker que muere a mitad deja el mensaje en 'procesando' para siempre. Esto lo
-- devuelve a la cola pasado un plazo, y lo da por fallido si ya agotó los intentos.
--
-- Sin este rescate la cola se degrada sola: cada caída deja mensajes que nadie volverá a
-- tocar, y nadie se entera porque no hay error, solo silencio.
CREATE OR REPLACE FUNCTION app.rescatar_mensajes(p_plazo interval DEFAULT interval '10 minutes', p_max_intentos integer DEFAULT 5)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_n integer;
BEGIN
  UPDATE app.mensajes
     SET estado = CASE WHEN intentos >= p_max_intentos THEN 'fallido' ELSE 'pendiente' END,
         procesando_desde = NULL,
         ultimo_error = coalesce(ultimo_error, 'el proceso que lo tomó no informó del resultado')
   WHERE estado = 'procesando' AND procesando_desde < now() - p_plazo;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

-- ── Encolar ──────────────────────────────────────────────────────────────────
-- Comprueba la supresión al encolar Y el worker debe volver a comprobarla antes de enviar:
-- entre una cosa y la otra puede haber llegado un rebote.
CREATE OR REPLACE FUNCTION app.encolar_mensaje(
  p_canal text, p_dest text, p_plantilla text, p_idioma text, p_datos jsonb, p_clave text DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM app.supresiones WHERE destinatario = lower(trim(p_dest))) THEN
    INSERT INTO app.mensajes (canal, destinatario, plantilla, idioma, datos, clave_unica, estado, ultimo_error)
    VALUES (p_canal, p_dest, p_plantilla, p_idioma, p_datos, p_clave, 'suprimido', 'destinatario en la lista de supresión')
    ON CONFLICT (clave_unica) WHERE clave_unica IS NOT NULL DO NOTHING
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  INSERT INTO app.mensajes (canal, destinatario, plantilla, idioma, datos, clave_unica)
  VALUES (p_canal, p_dest, p_plantilla, p_idioma, p_datos, p_clave)
  -- El predicado se repite a propósito: `ON CONFLICT` NO reconoce un índice único
  -- PARCIAL si no se le da también su condición. Sin esto falla con «no hay restricción
  -- única que coincida», que manda a buscar el índice donde el índice sí está.
  ON CONFLICT (clave_unica) WHERE clave_unica IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;   -- NULL si ya estaba encolado con esa clave
END $$;

-- ── Vista para el panel: sin datos personales ────────────────────────────────
-- El panel de administración enseña el destinatario ENMASCARADO y el error SANEADO.
-- Un panel que lista correos completos es una fuga con permisos, y un `ultimo_error` sin
-- sanear arrastra al panel el token que venía en la respuesta del proveedor.
CREATE OR REPLACE VIEW app.mensajes_panel AS
SELECT
  id, canal, plantilla, idioma, estado, intentos, proximo_intento, creado_en, enviado_en,
  regexp_replace(destinatario, '^(.{2}).*(@.*)$', '\1***\2')                    AS destinatario_enmascarado,
  regexp_replace(
    regexp_replace(coalesce(ultimo_error,''), '(token|password|secret|authorization)\s*[:=]\s*\S+', '\1=[oculto]', 'gi'),
    '[\w.+-]+@[\w-]+\.[\w.]+', '[correo]', 'g')                                 AS ultimo_error
FROM app.mensajes;
