# Pack · saas-multitenant

**Se activa si:** varios clientes u organizaciones comparten la misma instancia.

**Prompts:** `SAAS_PRODUCT_PROMPT.md`

---

## Reglas

### El aislamiento se impone, no se recuerda

Un filtro por organización que depende de que cada consulta se acuerde de ponerlo **va a
fallar**: basta un endpoint nuevo escrito con prisa. Las dos formas que sí aguantan:

1. **Aislamiento a nivel de fila** en la base, con el identificador de organización en el
   contexto de la sesión. La base deniega, no la aplicación.
2. **Una capa de acceso única** por la que pasan todas las consultas y que inyecta el
   filtro. Y un ratchet que detecte consultas que la esquiven.

Lo que **no** funciona: revisarlo en el code review.

El esqueleto está escrito y probado contra un PostgreSQL real:
[`aislamiento/politicas.sql`](aislamiento/politicas.sql) y
[`aislamiento/fuga.test.ts`](aislamiento/fuga.test.ts).

Dos detalles que deciden si esto sirve de algo, y que se olvidan:

- **`FORCE ROW LEVEL SECURITY`**, no solo `ENABLE`. Sin `FORCE`, la política **no se aplica
  al dueño de la tabla**: si la aplicación se conecta con el rol propietario, las políticas
  están ahí y no filtran nada.
- **Permisos sobre las secuencias.** Sin ellos, cualquier `INSERT` en una tabla con clave
  autoincremental falla con «permission denied for sequence» — y confunde, porque parece un
  problema de la política.

Y un mito que conviene tener claro: **omitir `WITH CHECK` en una política `FOR ALL` no abre
un agujero** — PostgreSQL reutiliza la expresión de `USING` como regla de escritura
(comprobado). El agujero real es otro: un `USING` **permisivo** —un `USING (true)` puesto
para leer un catálogo compartido— se hereda como regla de escritura, y entonces cualquiera
escribe en cualquier cliente sin que ningún error lo delate. Eso es lo que comprueba el
test.

### La prueba de fuga es obligatoria y automática

Un test que, con la identidad del cliente A, intenta leer y escribir datos del cliente B en
**cada** recurso. Es el test más importante del sistema y hay que escribirlo el primer día,
cuando hay tres endpoints, no el día que hay ochenta.

### El identificador de organización no viene del cliente

Sale del token o de la sesión. Un identificador de organización que llega en el cuerpo de
la petición es una escalada de privilegios esperando a ocurrir.

### Los datos de un cliente se pueden exportar y borrar, enteros

Sin ese camino, cada baja es un trabajo manual con riesgo. Y en muchas jurisdicciones es
una obligación legal, no una funcionalidad.

### La marca por cliente es datos, no ramas de código

Logo, colores y textos por organización viven en configuración. Un `if (cliente === 'X')`
en el código es el principio de una bifurcación que ya no se cierra.

### El vecino ruidoso

Límites por organización en peticiones, almacenamiento y trabajos en segundo plano. Sin
ellos, un cliente puede degradar el servicio de todos, y la factura la pagas tú.

### El soporte no es un accesorio: es infraestructura

En un producto multi-cliente, **es el único sitio por donde un fallo llega desde quien lo
sufre hasta quien puede arreglarlo**. Sin él, el camino real es un correo a alguien que
quizá esté de vacaciones, y el fallo tarda semanas — o no llega nunca, y el cliente se va
sin decir por qué.

`soporte/soporte.ts` y `soporte/soporte.sql` — **24 tests**, esquema verificado contra
PostgreSQL.

#### Es la única tabla con dos lectores legítimos

Todo lo demás del producto se aísla por cliente y punto. Aquí no: el cliente ve los suyos y
**la plataforma los ve todos**. Eso rompe el aislamiento de siempre, y hay que resolverlo a
propósito en vez de descubrirlo cuando falla.

La política deja pasar dos casos y solo dos, y el segundo es **explícito y auditable**: la
variable que marca al personal de la plataforma la fija el servidor tras comprobar el rol,
**nunca llega del cliente**. Y al ESCRIBIR se exige que la fila siga siendo del cliente
correcto incluso para soporte: sin eso, un error en el panel movería un ticket de una
organización a otra.

#### Cuatro decisiones que salen de implementaciones reales

**El estado «esperando cliente» no puede faltar.** Sin él, un ticket que espera respuesta
del cliente sigue contando como abierto y **la cola miente**: parece que el equipo va
retrasado cuando la pelota está en el otro campo. Y nadie sabe a cuáles insistir.

**El peso de la prioridad no es alfabético.** Ordenar la columna de texto en la base
devuelve «alta» por debajo de «baja» — la cola sale invertida justo en lo que más importa,
y se ve ordenada. Es un fallo real y silencioso.

**El no leído es por lado, con dos marcas de visto.** Con una sola, abrir el ticket desde
soporte marca como leído lo que el cliente no ha visto, y el cliente deja de recibir el
aviso de que le han contestado.

**El cliente puede reabrir respondiendo.** Es lo que evita que un «resuelto» prematuro le
obligue a abrir otro ticket y se pierda el hilo. Pero **cerrado es terminal**: reabrir uno
cerrado hace que el histórico deje de significar nada.

#### El número que mide al equipo

No es «tickets abiertos», es **cuántos esperan a soporte** — los que están abiertos o en
progreso y donde el último en hablar fue el cliente. Y junto a él, la **espera más larga**,
que es lo que de verdad duele a quien la sufre.

`resumir()` los calcula, y devuelve `null` —no cero— cuando no hay nada esperando: son
cosas distintas y en un panel se leen distinto.

#### El texto de un ticket viene de fuera

Es texto libre escrito por un tercero, y lo va a leer un panel interno, un resumen
automático o un agente. Se sanea antes de guardarlo, con el mismo criterio del pack
`api-backend`: **es dato, nunca instrucción**. Se limpian los caracteres invisibles, se
marcan los indicios y se delimita antes de entregárselo a un modelo — pero **no se rechaza**:
un falso positivo no puede costar un cliente real.

### El administrador global se registra

Todo acceso a datos de un cliente por parte de personal interno queda auditado: quién, qué,
cuándo y por qué. Es lo primero que pregunta cualquier auditoría.

---

## Checklist

- [ ] Aislamiento impuesto por la base o por una capa única — no por convención
- [ ] Prueba de fuga entre clientes, automática, cubriendo **todos** los recursos
      (la lista de tablas se descubre del esquema, no se escribe a mano: una escrita a
      mano garantiza que algún día falte una)
- [ ] `FORCE ROW LEVEL SECURITY` en todas, no solo `ENABLE`
- [ ] Sin variable de sesión, la consulta falla — nunca devuelve todo ni un vacío engañoso
- [ ] El identificador de organización sale del token, nunca de la petición
- [ ] Exportación y borrado completo por cliente, probados
- [ ] Personalización por datos, sin bifurcaciones en el código
- [ ] Límites por organización
- [ ] Acceso de personal interno auditado
- [ ] Hay canal de soporte dentro del producto, no un correo suelto
- [ ] La política de soporte permite los dos lectores de forma **explícita**
- [ ] El estado «esperando cliente» existe, y la cola lo separa de lo que espera al equipo
- [ ] Marca de visto **por lado**
- [ ] El texto de los tickets se sanea antes de guardarlo
