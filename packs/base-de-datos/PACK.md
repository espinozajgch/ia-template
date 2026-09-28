# Pack · base-de-datos

**Se activa si:** hay una base de datos con esquema propio y migraciones.

**Prompts:** `DATABASE_PROMPT.md` · capítulo `02_DATA_SCHEMAS.md`

---

## Reglas

### Comprobar a dónde apunta antes de migrar o borrar

La trampa más cara y más repetida: **dos bases de datos y el comando de migración apunta a
la que la aplicación no usa.** Entonces la aplicación corre con un esquema y las
migraciones viven en otro, y las políticas de aislamiento que se creen activas no lo están.

```bash
# Antes de CUALQUIER migración o borrado: verificar el destino real
grep -n 'DATABASE_URL\|DB_HOST' .env* | tail -5   # el cargador se queda con la última
```

Si hay más de una variable de conexión, **eso va a `AGENTS.md` §7** en la primera sesión.

### Cuánta integridad impone la base, y cuánta se confía al código

```bash
node agente/packs/base-de-datos/integridad.mjs             # contra la base viva
node agente/packs/base-de-datos/integridad.mjs --estatico  # sobre las migraciones
```

Señala las tablas **sin clave primaria** (sin ella no hay forma de referirse a una fila
concreta ni de replicar), las que no tienen **ninguna** restricción de dominio, las que
admiten NULL en casi todo y las que no tienen más índice que su clave.

**No dice que más restricciones sea mejor: dice dónde no hay ninguna.**

Medido sobre cuatro proyectos reales, por tabla creada:

| Proyecto | CHECK/tabla | Foráneas/tabla |
|---|---|---|
| laboratorio | **3,4** | 3,1 |
| ppsportmanagementarg | 1,0 | 2,1 |
| hipismo | 0,1 | 1,0 |
| professional-football-hub | 0,05 | 0,5 |

> El último tiene 62 tablas y **3 restricciones CHECK en total**, con 36 routers
> escribiendo contra ellas. Ahí la integridad la sostiene entera la aplicación.

### La invariante vive en el esquema

Una regla que solo existe en el código de la aplicación se rompe desde la consola, desde un
script de importación y desde el siguiente servicio. `NOT NULL`, `UNIQUE`, `CHECK`, claves
foráneas y `DEFAULT` no son adorno.

### Las migraciones son hacia adelante y idempotentes

Nunca se edita una migración ya aplicada: se escribe la siguiente. En tu máquina la base
está bien porque la aplicaste con la versión nueva; en producción sigue el efecto de la
vieja, y **nada lo dice**.

Toda migración se prueba sobre una copia con datos reales antes de tocar producción, y se
sabe cómo se revierte **antes** de aplicarla.

```bash
node agente/tools/esquema.mjs orden          # huecos, duplicados, coherencia con el journal
node agente/tools/esquema.mjs sellar         # tras aplicar en producción
node agente/tools/esquema.mjs sellos         # ¿cambió alguna ya sellada?
node agente/tools/esquema.mjs idempotencia   # DDL que no aguanta un reintento
node agente/tools/doble-pasada.mjs --motor postgres --servidor postgresql://localhost:5432 \
     --preparar 'DATABASE_URL="$DOBLE_PASADA_URL" npm run db:migrate'   # la aplica DE VERDAD dos veces
node agente/tools/esquema.mjs instantanea    # guarda el esquema vivo (pg_dump)
node agente/tools/esquema.mjs deriva         # compara vivo vs instantánea
```

Reconoce las tres convenciones sin configurar nada: `001_nombre.sql`, drizzle con
`_journal.json`, y directorios con sello de tiempo estilo prisma.

**`idempotencia` lee el SQL; `doble-pasada` lo ejecuta.** La primera atrapa el `CREATE
TABLE` sin `IF NOT EXISTS`; la segunda, lo que sólo falla contra el esquema real: el
`UPDATE` que la segunda vez choca con un `CHECK`, la política que ya existe, el `USING`
imposible. Crea una base efímera, la prepara con el ejecutor del propio proyecto y vuelve a
ejecutar tal cual cada migración nueva desde la rama base. Si no encuentra la rama base,
falla en vez de decir «OK». Viene del gate H-127 de ElevenOffice, el único de los cinco
proyectos que lo tenía a 2026-09-28. En CI necesita el historial (`fetch-depth: 0`) y, si
se trabaja directamente en `main`, `--base` con el commit anterior al push.

**Las excepciones se declaran, no se ignoran.** Una migración aplicada a mano en producción
es una decisión legítima; se escribe en `.ratchets/esquema-excepciones.json` **con su
razón** y deja de aparecer. Un verificador sin forma de declarar una excepción documentada
grita cada corrida, y lo que se hace con eso es apagarlo.

### La prueba de idempotencia de verdad es aplicarlas dos veces

El análisis estático encuentra el `CREATE TABLE` sin `IF NOT EXISTS`. Lo que demuestra que
una migración se puede reintentar es **aplicarla dos veces contra una base real** — está en
`agente/ci/github/integracion.yml`. Un despliegue que se corta a la mitad hay que poder
reintentarlo; si no, la base queda en el estado del que nadie sabe salir.

### Índices con su consulta

Un índice se añade con la consulta que lo justifica, y se comprueba con el plan de
ejecución que se usa. Los que no se usan cuestan escritura y espacio para siempre.

### N+1

Cada colección que se recorre haciendo una consulta por elemento. Se busca activamente: en
desarrollo, con veinte filas, es invisible.

### Multi-tenant: el aislamiento no se recuerda, se impone

Si hay varios clientes en la misma base, el filtro por organización **no puede depender de
que cada consulta se acuerde**. Aislamiento a nivel de fila, o una capa de acceso por la
que pasan todas. Ver el pack `saas-multitenant`.

### Los datos de producción no bajan a local

Y si hay que bajarlos, se anonimizan primero, con un script que vive en el repositorio.

---

## Checklist

- [ ] Verificado a qué base apuntan el comando de migración y la aplicación — **no asumido**
- [ ] Invariantes en el esquema, no solo en el código
- [ ] Migración probada sobre copia con datos reales, y con su vuelta atrás conocida
- [ ] `esquema.mjs orden` y `esquema.mjs sellos` en verde
- [ ] Las migraciones se aplican **dos veces** en la integración continua
- [ ] Índices nuevos justificados con la consulta y el plan de ejecución
- [ ] Sin N+1 en los caminos calientes
- [ ] Aislamiento por cliente impuesto, no recordado
