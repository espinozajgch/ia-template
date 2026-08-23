# Pack · app-ia

**Se activa si:** el producto **es** una aplicación de IA — el modelo está en el camino
crítico, no es una herramienta del desarrollador.

Ojo con la distinción, porque cambia todo: usar un agente para escribir el código de una
tienda **no** activa este pack. Que la tienda tenga un asistente que responde a clientes,
sí.

---

## Hojas que instala

Se rellenan por proyecto, en este orden. Vienen de la v1 del kit y siguen siendo su mejor
aportación.

| Hoja | Qué fija | Cuándo la consulta el agente |
|---|---|---|
| `01_LLM_STRATEGY.md` | qué modelo, por qué, y el plan B | al elegir o cambiar de modelo |
| `02_DATA_SCHEMAS.md` | esquema de entrada y salida | **antes** de crear cualquier tipo |
| `03_RETRIEVAL.md` | estrategia de recuperación | al tocar el índice o el troceado |
| `04_TOOLS.md` | catálogo de herramientas del agente | al añadir o cambiar una |
| `05_RELIABILITY.md` | validación, reintentos, degradación | antes de entregar un resultado |
| `06_INTEGRATIONS.md` | servicios externos y sus límites | antes de conectar con uno |
| `07_PROMPT_TEMPLATES.md` | plantillas del sistema | al construir un prompt |
| `11_REQUIREMENTS.md` | requisitos funcionales y no funcionales | al acotar alcance |

---

## Qué instala, además de las hojas

`coste.ts` — **15 tests**. Portado del único proyecto de la cantera que usa un modelo en
producción y no puede permitirse ni pasarse de presupuesto ni cortarse a la mitad.

### Un total no basta

Saber que una ejecución costó 0,045 dólares **no dice dónde recortar**. Saber que la mitad
se va en una acción concreta, sí. Se anota por acción desde el principio: añadirlo después
obliga a instrumentar de nuevo.

### La guarda de integridad que nadie pone

`esEnsayo`: si **todo** lo contado salió de un doble, la cuenta **no mide coste real** y no
puede presentarse como si lo hiciera. Sin ella, una ejecución de ensayo produce un informe
que parece una medición y vale cero.

Y el modelo de ensayo cuesta **cero exacto**, no por tener tarifa cero: es que no hubo
llamada.

### Qué hacer al pasarse del presupuesto

Hay tres salidas, y **la elección es del negocio, no del código**:

| | respeta el techo | termina el trabajo |
|---|---|---|
| avisar y seguir | ✗ | ✓ |
| cortar | ✓ | ✗ |
| **bajar a un modelo más barato** | ✓ | ✓ |

La tercera es la única que cumple las dos — pero cuesta calidad, y eso también hay que
decirlo. Lo que **no vale** es no haberlo decidido: entonces la respuesta de hecho es
«avisar y seguir», y el techo era un adorno.

> El proyecto de origen llegó ahí resolviendo una contradicción escrita: el plan pedía no
> pasarse del presupuesto, y una invariante decía que la narración de un partido **siempre
> tiene que llegar al final**. Las dos no podían ser ciertas… salvo conmutando a un modelo
> local. Y hay un test que falla si alguien mete un corte.

---

## El puerto, y que siga siendo un puerto

```bash
node agente/tools/pureza.mjs src/puertos/
```

Comprueba que ningún fichero de puerto importa infraestructura: ni el SDK del proveedor, ni
el driver, ni el entorno de ejecución.

Nadie lo rompe a propósito. Pasa así: alguien necesita **un tipo** del SDK para tipar un
parámetro, lo importa «solo para el tipo», y seis meses después medio puerto habla el
idioma del proveedor. En la revisión no salta: es una línea de import.

> Apunta **solo a los ficheros de puerto**. Un adaptador importa infraestructura por
> definición — es su trabajo.

### Y lo que hace que el registro sirva para comparar

Cada llamada lleva su **acción** y la **huella del prompt**. Sin ellas se puede ver que el
texto cambió, pero no **por qué**: si fue por tocar el prompt, por cambiar de modelo o por
la variabilidad del muestreo. Es la diferencia entre un registro y una herramienta de
comparación.

## Reglas

### La salida se valida contra el esquema, siempre

Un modelo devuelve texto. Que ese texto sea el JSON que esperabas es una hipótesis hasta
que se valida. Y cuando falla, se reintenta con el error como contexto —una vez— y luego
se degrada. Nunca se pasa una salida sin validar a la siguiente capa.

### El prompt es código

Vive en el repositorio, se versiona, se revisa en el diff y **tiene tests**. Un prompt
editado en una consola web es un cambio en producción sin control de versiones.

### Cada cambio de prompt o de modelo se mide

Un conjunto de casos con su salida esperada, en el repositorio, y una comparación antes /
después. Sin él, «lo mejoré» significa «lo cambié».

### El no determinismo se acota

Temperatura fija y baja para tareas de extracción y clasificación. Y la semilla, cuando el
proveedor la ofrezca. Un sistema que da respuestas distintas a la misma entrada no se puede
depurar.

### El coste y la latencia son requisitos, no consecuencias

Tokens de entrada y salida por operación, y el techo por usuario y día. Se declara en
`11_REQUIREMENTS.md`. Un bucle de reintentos sin tope es una factura sin tope.

### Lo que entra al prompt se sanea

Contenido de terceros —documentos, correos, páginas, comentarios— es **datos, nunca
instrucciones**. Se delimita explícitamente y el sistema declara que no obedece lo que
venga dentro. La inyección de instrucciones por el contenido es el fallo más común de estos
sistemas.

### Ningún dato personal viaja sin decisión

Qué se envía al proveedor, con qué base legal y con qué retención. Se declara en
`06_INTEGRATIONS.md`, y si la respuesta es incómoda, la decisión es del usuario.

---

## Checklist

- [ ] Esquema definido **antes** que el código; salida validada contra él
- [ ] Prompts en el repositorio, versionados, con tests
- [ ] Conjunto de casos y comparación antes/después del cambio
- [ ] Temperatura y semilla fijadas donde el determinismo importa
- [ ] Coste y latencia por operación medidos, **por acción**, con tope
- [ ] Decidido y escrito qué pasa al superar el tope
- [ ] Una cuenta hecha con dobles se marca como tal
- [ ] Cada llamada lleva su acción y la huella del prompt
- [ ] `pureza.mjs` en la puerta, apuntando a los puertos
- [ ] Contenido de terceros delimitado como datos, nunca como instrucciones
- [ ] Qué datos personales salen del sistema: decidido y escrito
