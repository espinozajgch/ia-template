-- Numeración correlativa de facturas.
--
-- El correlativo es lo único de una factura que NO se puede arreglar después. Un salto o
-- un duplicado en la serie es un problema con la administración tributaria, no un fallo
-- de software, y no hay migración que lo repare: los documentos ya se emitieron.
--
-- Por eso el número lo asigna LA BASE, dentro de la misma transacción que crea la
-- factura, y nunca la aplicación. Cualquier variante de «leer el último y sumar uno» en
-- el código tiene una carrera: dos peticiones simultáneas leen el mismo último y emiten
-- el mismo número. Con poco tráfico tarda meses en pasar, y pasa.
--
-- AJUSTAR: el esquema y el ancho del correlativo.

CREATE TABLE IF NOT EXISTS app.facturacion_series (
  entidad_id   text    NOT NULL,          -- quién emite: una empresa puede tener varias
  anio         integer NOT NULL,          -- casi todos los regímenes reinician cada año
  ultimo       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (entidad_id, anio)
);

-- Reserva el siguiente número de forma atómica.
--
-- `INSERT … ON CONFLICT DO UPDATE` con `RETURNING` hace las tres cosas en una sola
-- sentencia: crea la serie si es el primer documento del año, incrementa, y devuelve el
-- número reservado. La fila queda bloqueada hasta el fin de la transacción, así que dos
-- peticiones simultáneas se serializan y reciben números distintos.
CREATE OR REPLACE FUNCTION app.siguiente_correlativo(p_entidad text, p_anio integer)
RETURNS integer
LANGUAGE sql
AS $$
  INSERT INTO app.facturacion_series (entidad_id, anio, ultimo)
  VALUES (p_entidad, p_anio, 1)
  ON CONFLICT (entidad_id, anio) DO UPDATE SET ultimo = app.facturacion_series.ultimo + 1
  RETURNING ultimo;
$$;

-- Las facturas emitidas.
CREATE TABLE IF NOT EXISTS app.facturas (
  id              bigserial PRIMARY KEY,
  entidad_id      text        NOT NULL,
  anio            integer     NOT NULL,
  correlativo     integer     NOT NULL,
  numero_control  text        NOT NULL,   -- ENTIDAD-AÑO-NNNN, interno y único
  numero_visible  text        NOT NULL,   -- AÑO-NNNN, el que se imprime
  emitida_en      timestamptz NOT NULL DEFAULT now(),

  -- Los importes se GUARDAN, no se recalculan. Una alícuota que cambie mañana no puede
  -- alterar lo emitido: eso no sería recalcular, sería falsificar un documento.
  base_imponible  numeric(14,2) NOT NULL,
  sin_impuesto    numeric(14,2) NOT NULL DEFAULT 0,
  impuesto        numeric(14,2) NOT NULL,
  retencion       numeric(14,2) NOT NULL DEFAULT 0,
  total           numeric(14,2) NOT NULL,
  total_a_cobrar  numeric(14,2) NOT NULL,

  -- La conversión también se congela: importe canónico, moneda, tasa y fecha de la tasa.
  moneda_base     text          NOT NULL DEFAULT 'USD',
  moneda_destino  text,
  tasa            numeric(18,6),
  fecha_tasa      date,

  -- El desglose por alícuota y las líneas, tal como se emitieron.
  lineas          jsonb       NOT NULL,
  por_alicuota    jsonb       NOT NULL DEFAULT '[]',

  anulada_en      timestamptz,            -- se ANULA, no se borra: el número queda gastado
  anulada_motivo  text,

  UNIQUE (entidad_id, anio, correlativo),
  UNIQUE (numero_control)
);

-- Una factura emitida es inmutable. Se corrige emitiendo otra —una nota de crédito o una
-- rectificativa, según el régimen— nunca editando la original.
CREATE OR REPLACE FUNCTION app.facturas_inmutables() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Lo único que puede cambiar después de emitir es la anulación.
  IF (OLD.correlativo, OLD.numero_control, OLD.total, OLD.impuesto, OLD.lineas)
     IS DISTINCT FROM
     (NEW.correlativo, NEW.numero_control, NEW.total, NEW.impuesto, NEW.lineas) THEN
    RAISE EXCEPTION 'una factura emitida no se modifica: emite una rectificativa (factura %)', OLD.numero_control;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_facturas_inmutables ON app.facturas;
CREATE TRIGGER trg_facturas_inmutables
  BEFORE UPDATE ON app.facturas
  FOR EACH ROW EXECUTE FUNCTION app.facturas_inmutables();

-- Borrar una factura emitida deja un hueco en la serie, que es justo lo que no puede pasar.
CREATE OR REPLACE FUNCTION app.facturas_no_se_borran() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'una factura emitida no se borra: anúlala (factura %)', OLD.numero_control;
END $$;

DROP TRIGGER IF EXISTS trg_facturas_no_se_borran ON app.facturas;
CREATE TRIGGER trg_facturas_no_se_borran
  BEFORE DELETE ON app.facturas
  FOR EACH ROW EXECUTE FUNCTION app.facturas_no_se_borran();
