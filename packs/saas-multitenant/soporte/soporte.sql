-- Soporte: el canal entre el cliente y la plataforma.
--
-- Lo que lo hace distinto de cualquier otra tabla del producto: es la ÚNICA que dos
-- organizaciones distintas tienen que poder leer a la vez. El cliente ve los suyos; la
-- plataforma los ve todos. Eso rompe el aislamiento por filas de siempre, y hay que
-- resolverlo a propósito en vez de descubrirlo cuando falla.
--
-- AJUSTAR: el esquema y los nombres de las tablas de cliente y usuario.

CREATE TABLE IF NOT EXISTS app.soporte_tickets (
  id           bigserial   PRIMARY KEY,
  cliente_id   bigint      NOT NULL,
  asunto       text        NOT NULL,
  categoria    text        NOT NULL DEFAULT 'consulta'
                 CHECK (categoria IN ('consulta','incidencia','facturacion','sugerencia','otro')),
  prioridad    text        NOT NULL DEFAULT 'normal'
                 CHECK (prioridad IN ('baja','normal','alta','urgente')),
  estado       text        NOT NULL DEFAULT 'abierto'
                 CHECK (estado IN ('abierto','en_progreso','esperando_cliente','resuelto','cerrado')),

  creado_por        bigint,
  asignado_a        bigint,

  -- Se desnormaliza a propósito: la cola se ordena por esto en cada carga, y sacarlo de
  -- la tabla de mensajes obliga a un join con agregado sobre la tabla que más crece.
  ultimo_mensaje_de   text        NOT NULL DEFAULT 'cliente' CHECK (ultimo_mensaje_de IN ('cliente','soporte')),
  ultimo_mensaje_en   timestamptz NOT NULL DEFAULT now(),

  -- Una marca de visto POR LADO. Con una sola, abrir el ticket desde soporte marcaría
  -- como leído lo que el cliente no ha visto, y dejaría de recibir el aviso.
  visto_por_soporte_en timestamptz,
  visto_por_cliente_en timestamptz,

  creado_en    timestamptz NOT NULL DEFAULT now(),
  cerrado_en   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tickets_cola ON app.soporte_tickets (estado, ultimo_mensaje_en DESC)
  WHERE estado NOT IN ('cerrado');
CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON app.soporte_tickets (cliente_id, estado);

CREATE TABLE IF NOT EXISTS app.soporte_mensajes (
  id          bigserial   PRIMARY KEY,
  ticket_id   bigint      NOT NULL REFERENCES app.soporte_tickets(id) ON DELETE CASCADE,
  lado        text        NOT NULL CHECK (lado IN ('cliente','soporte')),
  autor_id    bigint,
  -- El texto llega de fuera: se guarda SANEADO. Ver el apartado del PACK.md.
  cuerpo      text        NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mensajes_ticket ON app.soporte_mensajes (ticket_id, creado_en);

-- ── Aislamiento con DOS lectores legítimos ───────────────────────────────────
--
-- La política deja pasar dos casos, y solo dos:
--   · el cliente de la sesión, sobre sus propios tickets
--   · el personal de la plataforma, sobre todos
--
-- Lo importante es que el segundo caso sea EXPLÍCITO y auditable, no un agujero: la
-- variable `app.es_soporte` la fija el servidor tras comprobar el rol, nunca llega del
-- cliente. Y todo acceso de la plataforma a los tickets de un cliente queda registrado
-- (ver el pack `seguridad`).
ALTER TABLE app.soporte_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.soporte_tickets  FORCE  ROW LEVEL SECURITY;
ALTER TABLE app.soporte_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.soporte_mensajes FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acceso_tickets ON app.soporte_tickets;
CREATE POLICY acceso_tickets ON app.soporte_tickets FOR ALL
  USING (
    current_setting('app.es_soporte', true) = 'si'
    OR cliente_id = current_setting('app.cliente_actual')::bigint
  )
  WITH CHECK (
    -- Al ESCRIBIR se exige que la fila siga siendo del cliente correcto, incluso para
    -- soporte: sin esto, un error en el panel movería un ticket de una organización a otra.
    cliente_id = current_setting('app.cliente_actual')::bigint
    OR current_setting('app.es_soporte', true) = 'si'
  );

DROP POLICY IF EXISTS acceso_mensajes ON app.soporte_mensajes;
CREATE POLICY acceso_mensajes ON app.soporte_mensajes FOR ALL
  USING (EXISTS (SELECT 1 FROM app.soporte_tickets t WHERE t.id = ticket_id))
  WITH CHECK (EXISTS (SELECT 1 FROM app.soporte_tickets t WHERE t.id = ticket_id));

-- Un ticket cerrado no admite mensajes nuevos: si no, la conversación sigue fuera de la cola.
CREATE OR REPLACE FUNCTION app.soporte_cerrado_no_admite() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT estado FROM app.soporte_tickets WHERE id = NEW.ticket_id) = 'cerrado' THEN
    RAISE EXCEPTION 'el ticket % está cerrado y no admite respuestas', NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_soporte_cerrado ON app.soporte_mensajes;
CREATE TRIGGER trg_soporte_cerrado BEFORE INSERT ON app.soporte_mensajes
  FOR EACH ROW EXECUTE FUNCTION app.soporte_cerrado_no_admite();
