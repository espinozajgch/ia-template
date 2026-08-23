# Pack · api-backend

**Se activa si:** hay una API, servicio HTTP, RPC o worker que atiende peticiones.

**Prompts:** `ARCHITECTURE_PROMPT.md` · `APPSEC_PROMPT.md`

---

## Reglas

### La autorización vive en el borde, una sola vez

Repartida por los handlers, la autorización siempre acaba teniendo un hueco. El fallo
clásico es un guard que solo cubre lectura montado en un router que además escribe: **la
declaración parece protección**, y la ausencia del segundo guard no salta a la vista
porque no hay nada que mirar — es una línea que no está.

Comprobación obligatoria: por cada ruta que escribe, **¿qué la autoriza?** Con nombre.

### Fail-closed, siempre

Ante un error del comprobador de permisos, se deniega. Un `catch` que deja pasar es una
puerta abierta con registro.

### La excepción cruda nunca llega a la respuesta

Un error de infraestructura en el cuerpo del 500 le cuenta al atacante el motor de base de
datos, la ruta del fichero y a veces la consulta. Error tipado hacia fuera, detalle en el
log con su identificador de correlación.

### Un fallo nunca se convierte en un vacío que parece correcto

`except: pass` y `catch { return [] }` son la forma más cara de romper un sistema: la
pantalla muestra «no hay resultados» y nadie investiga durante semanas. Si algo falla,
falla **ruidosamente**.

### Los efectos secundarios no rompen el resultado principal

El correo que no sale, la métrica que no se envía, el webhook que no responde: se aíslan,
se registran y **no** tumban la operación que el usuario pidió. Y al revés — no se dan por
hechos si nunca se comprobó que salían.

### Idempotencia donde hay reintentos

Todo lo que se reintenta necesita una clave de idempotencia o una comprobación previa. Un
reintento sin ella es un cobro duplicado.

### Límites declarados en cada llamada saliente

Timeout, reintentos con espera creciente y *jitter*, y qué se hace cuando el otro lado no
está. Sin timeout, un servicio lento tumba el propio.

### Validación en el borde, tipos dentro

Lo que entra se valida contra el esquema en la frontera; a partir de ahí, el tipo se
respeta. Validar en cada capa es no confiar en ninguna.

---

## Ratchets sugeridos

```bash
R=agente/tools/ratchet.sh
$R baseline any-o-supresiones "grep -rnE ': any\b|@ts-nocheck|# type: ignore|// nolint' src/ server/"
$R baseline capturas-mudas    "grep -rnE 'except.*:\s*pass|catch\s*\{\s*\}|catch\s*\(\w*\)\s*\{\s*\}' ."
$R baseline loc-routers       "find server -name '*rout*' -o -name '*controller*' | xargs -I{} sh -c 'wc -l {}' | awk '\$1>400'"
```

---

## La cobertura, por capa y sin maquillar

Un umbral global esconde que la capa de rutas está al 30 % mientras las utilidades están al
95 %. Umbrales **por capa**, arrancando en lo medido:

```bash
node agente/tools/cobertura.mjs proponer      # los umbrales, medidos hoy
node agente/tools/cobertura.mjs enmascarados  # ficheros que su capa está tapando
node agente/tools/cobertura.mjs excluidos     # código real fuera del cómputo
```

Y la regla que los sostiene: **no se excluye una carpeta del cómputo para que suba el
número, y no se baja un piso para que la puerta pase.** Se suman tests.

## La cobertura miente; la mutación no

La cobertura dice **cuánto código se ejecuta** durante los tests. No dice si los tests
**comprueban** algo: un test que llama a la función y no afirma nada da 100 % de cobertura
y pasa con el código roto.

La mutación cambia el código a propósito —invierte una condición, borra una línea, cambia
un `>` por un `>=`— y comprueba que **algún test se pone en rojo**. El mutante que
sobrevive señala exactamente qué línea no está protegida.

```jsonc
// package.json — con Stryker, sobre lo que ya tienes
"mutation": "stryker run"
```

Empieza por **un módulo**, el de la lógica de negocio más delicada, y con el umbral en lo
que salga. Correrla sobre todo el repositorio la primera vez tarda horas y no dice nada
accionable.

De los trece proyectos de la cantera, uno solo la tiene. Es la diferencia entre saber que
los tests corren y saber que sirven.

## Qué instala el pack

| Fichero | Qué resuelve |
|---|---|
| `errores.ts` | un solo sitio decide qué sale por el cable · **16 tests** |
| `contexto.ts` | el cliente y el usuario de la petición, sin pasarlos por parámetro · **9 tests** |
| `integracion.plantilla.test.ts` | el arnés que ejecuta el SQL real, hermético |

---

## Las tres capas de un error

```
estado HTTP   para el cliente y los intermediarios: 404, 409, 500
código        para el CÓDIGO del cliente: NO_ENCONTRADO, CONFLICTO — estable, no se traduce
mensaje       para la persona: cambia, se traduce, no se compara nunca
```

Mezclarlas produce clientes que comparan cadenas de texto para decidir. El día que alguien
corrige una tilde, el cliente deja de funcionar.

### Tres detalles que costaron incidentes

**El código de la base se busca caminando por `cause`.** Los ORM envuelven el error del
driver —drizzle lanza `new Error('Failed query', { cause })`—, así que leer solo el `.code`
de arriba hacía que el registro contradijera a la respuesta: un 409 en el cable y un código
indefinido en el log. La traza no servía para diagnosticar nada.

**Un duplicado sale como 409, no como 500.** Un 500 dice «fallo del servidor», así que
quien lo recibe reintenta y avisa a operaciones — cuando el problema estaba en el cuerpo de
su propia petición.

**El stack se registra solo para lo inesperado, y NUNCA sale en la respuesta.** Un error de
negocio deliberado es ruido en el log cuando hay volumen. Y sobre la respuesta: no es una
precaución excesiva. Si existe un camino por el que el stack puede aparecer, ese camino se
activa en producción el día que alguien despliega con la variable de entorno mal puesta.
**Que no exista el camino es la única garantía.**

---

## El contexto de la petición, sin pasarlo por parámetro

Toda consulta necesita saber de qué cliente es la petición y quién la hizo. Las dos salidas
habituales fallan:

- **Pasarlo por parámetro** contamina la firma de cada función que hay en medio, y basta que
  alguien añada una ruta olvidándolo para que la consulta salga sin filtrar.
- **Una variable global**, con peticiones concurrentes, hace que la de un usuario responda
  con los datos de otro. No es hipotético.

`AsyncLocalStorage` da un almacén atado a la **cadena de ejecución**, y un `Proxy` sobre el
cliente de datos hace que la aplicación siga importando `db` como siempre.

### La regla que decide si esto rompe tus tests

**Sin contexto, transparencia total.** Se devuelve la propiedad del cliente base *sin
ligar*, preservando la identidad de los métodos. Si se ligara siempre, `db.select === db.select`
daría falso y **ningún espía ni simulacro volvería a reconocerlo**: el proxy sería correcto
y la suite entera se caería sin que nadie entendiera por qué.

Y el cliente se devuelve al pozo cuando la respuesta termina, con `finish` **y** `close`.
Sin eso, cada petición que falla se lleva un cliente para siempre y el pozo se agota en
horas — un fallo que en desarrollo no se ve nunca.

---

## La integración va contra una base real

Los tests con la base mockeada no ven los fallos que viven en el SQL: un `= ANY($1)` mal
escrito, una política de aislamiento que no filtra, una migración que no es idempotente.

La plantilla `agente/ci/github/integracion.yml` levanta un Postgres efímero que nace y
muere con la ejecución — seguro, sin tocar ningún entorno — aplica las migraciones **dos
veces** para probar que son idempotentes, y corre los tests contra el SQL de verdad.

`integracion.plantilla.test.ts` trae el arnés, con las dos propiedades que lo hacen viable:

- **Se salta solo** sin `TEST_DATABASE_URL`, así que la suite de cualquiera sigue siendo
  rápida y no exige una base levantada.
- **Es hermético**: cada caso corre en una transacción que se **descarta**. No deja basura,
  no depende del orden y se puede correr mil veces. Con `ROLLBACK` y no con `DELETE` — un
  borrado de limpieza puede disparar un trigger de borrado lógico y dejar la fila ocupando
  su clave única.

La familia de fallos que esto atrapa y ningún otro test ve: un `= ANY($1)` con el operador
equivocado, un join que multiplica filas, un `COALESCE` que no cubre el NULL que sí llega,
una política de aislamiento que no filtra lo que se creía.

---

## Checklist antes de dar por hecho

- [ ] Cada ruta nueva: quién la autoriza, con nombre
- [ ] Los métodos de escritura del router están cubiertos, no solo los de lectura
- [ ] Ningún detalle interno sale en la respuesta de error
- [ ] Ningún fallo se convierte en vacío silencioso
- [ ] Timeout y reintentos en toda llamada saliente
- [ ] Las operaciones reintentables son idempotentes
- [ ] Contrato documentado y **versionado** si otro sistema depende de él
- [ ] Sin ciclos de importación: `node agente/tools/ciclos.mjs src`
- [ ] Si hay base de datos: migraciones idempotentes, probadas aplicándolas dos veces
- [ ] **Todos** los manejadores envueltos, y un manejador final montado el último
- [ ] Ningún cliente compara el mensaje: compara el código
- [ ] Al menos un test de integración por repositorio con SQL no trivial
