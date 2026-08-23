# Pack · observabilidad

**Se activa si:** el sistema corre en algún sitio donde no puedes ponerle un depurador —
o sea, en producción.

**Sale de** el único proyecto de la cantera que lo tiene resuelto: 71 ficheros con registro
estructurado y **192 con identificador de correlación**. El siguiente tiene 18. Uno de ellos,
una aplicación clínica en producción, tiene **cero y uno**.

---

## Por qué este pack existe

El kit tenía puerta de calidad, verificadores, ratchets y plantillas de despliegue. **Todo
para antes de desplegar.** Nada para después.

Y la pregunta que decide si un incidente dura veinte minutos o dos días es siempre la
misma: *«¿qué le pasó a esta persona a las 11:40?»*. Sin registro estructurado y sin
correlación, no tiene respuesta.

---

## Qué instala

| Fichero | Qué resuelve | Tests |
|---|---|---|
| `registro.ts` | registro estructurado con **redacción central** | 22 |
| `correlacion.ts` | seguir una petición por todo su recorrido | 5 |
| `salud.ts` | dos sondas, y por qué son dos | 5 |

---

## 1 · La redacción es central, no disciplina de quien llama

Si depende de que cada llamada recuerde no pasar el cuerpo de la petición, **un día alguien
lo pasa** — y el pasaporte, el teléfono o el diagnóstico acaban en la salida estándar, de
ahí al recolector de registros y de ahí a treinta días de retención.

Con la redacción en el registrador, esa llamada es inofensiva:

```ts
registro.info('peticion', { cuerpo: req.body });
// → { cuerpo: { nombre: "Ana", email: "[REDACTADO]", password: "[REDACTADO]" } }
```

### Dos niveles, y el motivo de cada uno

| | Para qué | Ejemplo del problema que evita |
|---|---|---|
| **exacto** | nombres cortos o ambiguos | `ip` está dentro de `description`; `nie` dentro de `denied` |
| **parcial** | nombres largos e inequívocos | cubre `userEmail`, `emailContacto`, `usuario_email`, `telefonoFijo` |

**Un conjunto solo exacto sobre datos personales es un hueco por diseño**: da sensación de
cobertura sin tenerla, porque nadie escribe siempre la misma clave.

### Lo que NO se redacta, y está escrito

- **`nombre` y `apellido`** — el principal asidero para depurar, aparecen en decenas de
  claves que no son datos personales (`nombreArchivo`, `nombreTabla`), y un nombre sin
  contacto ni documento es de sensibilidad media. Redactarlos vacía el registro a cambio de
  poco.
- **`ip` y `userAgent`** — son datos personales, pero son el insumo del análisis forense y
  de las alarmas de fuerza bruta. Redactarlos ciega esas alarmas. El control correcto sobre
  ellos es la **retención**, no la redacción.

Las dos son discutibles y dependen del proyecto. Lo que no es discutible es que estén
**decididas y escritas**, en vez de haber pasado sin que nadie lo pensara.

### El registrador no puede lanzar

Se llama **dentro de los `catch`**: si lanza aquí, tumba el manejador y enmascara el
incidente original. Se neutralizan ciclos, `BigInt`, funciones y errores; si todo falla,
sale una entrada mínima.

> **Un grafo no es un ciclo.** Un ciclo es una referencia a un *ancestro del camino actual*,
> no «algo ya visto». Con un conjunto global, el mismo objeto en dos ramas
> —`{ jugador, contrato: { jugador } }`— se marcaba `[Circular]` siendo perfectamente
> serializable, y se perdía diagnóstico justo cuando más falta hace. Hay dos tests que lo
> cubren.

---

## 2 · Correlación

Si cada llamada al registro tiene que pasar el identificador, todo lo que se registre desde
una capa que **no recibe la petición** —servicios, repositorios, ayudantes— queda sin
correlación. Y es justo donde ocurren los fallos interesantes.

Dos decisiones del middleware:

**Reutiliza el identificador que venga de fuera.** Es lo que permite seguir una operación a
través de varios servicios: si cada uno genera el suyo, hay tres registros de la misma cosa
y ninguna forma de juntarlos. Se acota a 128 caracteres — una cabecera de fuera es entrada
no confiable, y un identificador de 8 KB acaba en cada línea.

**Lo devuelve en la respuesta.** Quien informa de un fallo puede dar el identificador, y
encontrarlo es inmediato en vez de una búsqueda por hora aproximada.

Y se registra **al terminar**, no al empezar: una línea por petición, con estado y duración.

---

## 3 · Dos sondas, no una

Es la distinción que casi nadie hace, y decide si un despliegue pierde peticiones.

| Sonda | Pregunta | Si falla | Comprueba dependencias |
|---|---|---|---|
| **vida** | ¿el proceso responde? | lo **matan** y arrancan otro | **no** |
| **disponibilidad** | ¿puede atender ahora? | dejan de mandarle tráfico | **sí** |

**Por qué vida no comprueba dependencias:** si la base se cae y la sonda de vida falla, se
reinician **todas** las instancias en bucle — y cuando la base vuelva, no habrá nada arriba
que la use. La disponibilidad, en cambio, saca la instancia del reparto sin matarla, y se
reincorpora sola.

Con una sola sonda hay que elegir entre reiniciar por algo que no es culpa del proceso, o
mandar tráfico a una instancia que no puede atenderlo. **Las dos opciones son malas.**

Y dos detalles: una dependencia **secundaria** caída no saca la instancia de servicio
—degrada, no tumba—; y cada comprobación lleva **límite de tiempo**, porque sin él una base
que no responde deja la sonda colgada y se pierde la información de *qué* falló.

---

## Lo que hay que decidir en cada proyecto

| Decisión | Notas |
|---|---|
| Qué se añade a la lista de redacción | el dominio manda: en salud, más; en un catálogo público, menos |
| Retención de los registros | es el control real sobre `ip` y `userAgent` |
| Nivel mínimo en producción | `info` suele bastar; `debug` en producción es ruido y coste |
| Qué dependencias son críticas | una caída secundaria no debe sacar la instancia |
| Dónde se agregan los registros | el pack emite JSON por la salida estándar, que es lo que todos los recolectores leen |

---

## Checklist

- [ ] Registro estructurado, JSON, por la salida estándar
- [ ] Redacción **central**, no confiada a quien llama
- [ ] Lo que se decide NO redactar está escrito, con su porqué
- [ ] El registrador no puede lanzar
- [ ] Identificador de correlación en cada entrada, propagado sin pasarlo
- [ ] El identificador entrante se reutiliza y se devuelve en la respuesta
- [ ] Una línea por petición al terminar, con estado y duración
- [ ] Dos sondas: vida sin dependencias, disponibilidad con ellas y con límite de tiempo
- [ ] Retención definida para los registros con datos personales
