-- bitacora.sql — la tabla de auditoría, en PostgreSQL. Idempotente: se puede aplicar dos veces.
--
-- ⚠️ EJEMPLO REAL DE OTROS PROYECTOS: reúne lo mejor de las bitácoras de Pulso y de hipismo
-- (2026-09-28). Cambia `app_rol` por el rol con el que se conecta tu aplicación.
--
-- Lo que decide este fichero, y por qué (el detalle, en PACK.md § Bitácora):
--
--   · El actor se COPIA en la fila (id, correo, rol). Si la cuenta se renombra o cambia de
--     rol, el evento sigue diciendo quién era en ese momento. Resolverlo con un JOIN haría
--     que la auditoría se reescribiera sola con el presente. (Pulso)
--   · `antes` y `despues`: sin el antes no se sabe qué cambió. Van YA TACHADOS por la
--     aplicación —contraseñas, testigos, claves— antes de llegar aquí. (Pulso · hipismo)
--   · `peticion` y `sesion_hash` enlazan el evento con el registro de la petición y con la
--     sesión, sin guardar el testigo de sesión en claro. (Pulso)
--   · SOLO SE AÑADE. El REVOKE ata a la aplicación; el disparador sobrevive a una migración
--     futura que vuelva a conceder UPDATE/DELETE «a todas las tablas» de una pasada, que es
--     como se pierde el REVOKE sin que nadie lo note. (hipismo)
--   · La fila se escribe en la MISMA transacción que el cambio que describe: si el cambio se
--     deshace, su evento también. Eso no lo puede imponer SQL; lo impone quien llama.

CREATE TABLE IF NOT EXISTS bitacora (
  id           BIGSERIAL    PRIMARY KEY,
  ocurrido_el  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  empresa_id   BIGINT,                        -- NULL: plano de plataforma
  actor_id     BIGINT       NOT NULL,         -- 0: el sistema (tarea programada)
  actor_email  TEXT,
  actor_rol    TEXT,
  accion       TEXT         NOT NULL CHECK (accion ~ '^[a-z0-9_.]+$'),
  objeto       TEXT         NOT NULL,
  objeto_id    TEXT,
  antes        JSONB,
  despues      JSONB,
  peticion     TEXT,
  sesion_hash  TEXT
);

CREATE INDEX IF NOT EXISTS bitacora_objeto_idx  ON bitacora (objeto, objeto_id, ocurrido_el DESC);
CREATE INDEX IF NOT EXISTS bitacora_actor_idx   ON bitacora (actor_id, ocurrido_el DESC);
CREATE INDEX IF NOT EXISTS bitacora_empresa_idx ON bitacora (empresa_id, ocurrido_el DESC);

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE bitacora FROM PUBLIC;
DO $$
BEGIN
  REVOKE UPDATE, DELETE, TRUNCATE ON TABLE bitacora FROM app_rol;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'el rol app_rol no existe todavía: quítale UPDATE, DELETE y TRUNCATE al crearlo';
END $$;

CREATE OR REPLACE FUNCTION bitacora_solo_se_anade() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'la bitácora sólo admite añadir: % no está permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS bitacora_solo_se_anade ON bitacora;
CREATE TRIGGER bitacora_solo_se_anade
  BEFORE UPDATE OR DELETE ON bitacora
  FOR EACH ROW EXECUTE FUNCTION bitacora_solo_se_anade();

-- TRUNCATE no dispara los disparadores de fila: necesita el suyo.
DROP TRIGGER IF EXISTS bitacora_sin_truncate ON bitacora;
CREATE TRIGGER bitacora_sin_truncate
  BEFORE TRUNCATE ON bitacora
  FOR EACH STATEMENT EXECUTE FUNCTION bitacora_solo_se_anade();

-- Purgar por retención se hace como propietario y a propósito, en tres órdenes:
--   ALTER TABLE bitacora DISABLE TRIGGER bitacora_solo_se_anade;
--   DELETE FROM bitacora WHERE ocurrido_el < now() - interval '…';
--   ALTER TABLE bitacora ENABLE TRIGGER bitacora_solo_se_anade;
-- Que cueste tres órdenes deliberadas en vez de un DELETE es el punto.
