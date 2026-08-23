# La puerta de calidad

> El mecanismo que más regresiones ha evitado en estos proyectos, y el que más veces se
> saltó por prisa. Nada está hecho hasta que pasa **entera**.

---

## 1 · Un solo comando

Si verificar exige recordar cinco comandos, alguien va a correr tres. **La puerta es un
comando**, y si no existe, **crearlo es la primera tarea del proyecto**:

```jsonc
// package.json — ejemplo
"scripts": {
  "quality:check": "npm run lint && npm run build && npm run coverage && npm run ratchets && npm run e2e"
}
```

```make
# Makefile — equivalente para otros stacks
quality: lint build test ratchets e2e
```

Se declara en `AGENTS.md` §4 y lo usan las skills `verificar` y `avanzar`.

---

## 2 · La fuente de verdad es la CI

Lo que ejecuta la integración continua **es** la puerta. Si CI está en verde y en local no
se corrió lo mismo, no se verificó nada: se adivinó.

```bash
ls .github/workflows/ .gitlab-ci.yml .circleci/ Jenkinsfile 2>/dev/null
```

Cada `run:` de esa definición es un paso de la puerta. Lo que aparezca en CI y no se pueda
correr en local —un servicio gestionado, una credencial que no se tiene— **se dice en la
salida**, no se omite en silencio.

---

## 3 · Orden que ahorra tiempo

1. **Compilar y comprobar tipos** — falla en segundos y ahorra el resto.
2. **Unidades** — rápido, y localiza el fallo.
3. **Integración y extremo a extremo** — lento, y su fallo suele venir de lo anterior.
4. **Auditar** — dependencias y secretos.
5. **Verificadores estructurales** — ver §5.
6. **Cobertura** — ver §6.
7. **Ratchets** — ver §7.

Las plantillas de workflow que montan esto están en `agente/ci/`, con lo que hay que
ajustar de cada una.

Lo lento va en segundo plano y se sigue con documentación mientras corre. **Esperar no es
motivo para informar.**

Si algo falla: arreglar y **repetir la puerta entera**, no solo el paso que falló.

> **El chequeo de tipos no sustituye al build.** Es el error que más veces ha roto CI en
> estos proyectos: `tsc --noEmit` en verde y `build` en rojo por un import sin usar.

---

## 4 · El extremo a extremo se corre en local, siempre

Los tests unitarios **no** detectan: roles ARIA inválidos, banners de error sin
`role="alert"`, deriva entre fixtures y realidad, selectores rotos de pestañas o
desplegables, una hoja de estilos que se descarga y no se aplica, un contenedor que
arranca y muere al primer contacto con la base.

Un suite de extremo a extremo que **simula la red** (`/api` mockeado) no toca producción y
se puede correr en cualquier máquina. Esa es la configuración que hay que buscar: si tocar
la base real es el precio de correrlo, nadie lo va a correr.

---

## 5 · Verificadores estructurales

Tres cosas que **ningún test funcional detecta**, porque el código funciona: lo que se
degrada es la forma, no el comportamiento. Por eso van aparte.

```bash
node agente/tools/ciclos.mjs    src        # ciclos de importación
node agente/tools/tamano.mjs    validate   # ficheros que crecen
node agente/tools/secretos.mjs             # credenciales en lo trackeado y en el remoto
node agente/tools/esquema.mjs   orden      # migraciones: huecos, duplicados, journal
node agente/tools/esquema.mjs   sellos     # ¿cambió una migración ya aplicada?
node agente/tools/cobertura.mjs validar    # la cobertura no baja
node agente/tools/pureza.mjs    src/puertos/   # los puertos no importan infraestructura
```

**Ciclos.** `A → B → A` no rompe nada hoy: el empaquetador lo resuelve y los tests pasan.
Rompe el día que alguien mueve una inicialización al cuerpo del módulo y uno de los dos
lados recibe `undefined` al cargar — un fallo que aparece solo en producción y según el
orden del bundle. Para romperlo: extraer lo compartido a un tercer módulo, o invertir la
dependencia pasando lo que hace falta como parámetro.

**Tamaño.** Un fichero que crece es una responsabilidad mezclándose con otra. Es un
trinquete, no un límite: acepta el componente de 2.000 líneas que ya existe y solo prohíbe
que llegue a 2.001.

**Migraciones.** Dos con el mismo número se aplican en un orden en la máquina de quien
las escribió y en otro en producción — cuando el orden lo decide el nombre del fichero.
Y editar una ya aplicada es el error más caro: en tu máquina la base está bien porque la
aplicaste con la versión nueva; en producción sigue el efecto de la vieja, y **nada lo
dice**. Una migración aplicada es historia: se escribe la siguiente.

**Cobertura.** No es el porcentaje: es que **no baje**, y que el número signifique algo.
Ver §7.

**Secretos.** Sobre ficheros trackeados **y sobre la URL del remoto** — el caso real es un
token embebido en `git remote -v`, visible en cualquier copia del directorio. Un secreto
que entra una vez al historial está comprometido para siempre: reescribir el historial no
borra los forks ni los clones. Lo único que arregla una fuga es **rotar la credencial**.

---

## 6 · La cobertura, y los tres fallos que la vuelven inútil

Un porcentaje de cobertura alto no significa nada por sí solo. Tres cosas lo vacían, y las
tres se ven en repositorios reales:

**Excluir para inflar.** Sacar `routes/` o `pages/` del cómputo sube el número sin mejorar
nada. Un 93 % que excluye la mitad del código es **peor** que un 44 % honesto, porque
impide ver el problema. El proyecto más maduro de esta cantera bajó a propósito del 93 % al
44 % el día que dejó de excluir sus páginas y sus rutas. Bajar un número para que signifique
algo es la decisión correcta.

```bash
node agente/tools/cobertura.mjs excluidos   # qué código de src/ no entra en el cómputo
```

**Enmascaramiento por agregación.** Un umbral sobre `src/pages/**` mete noventa ficheros en
un solo grupo: uno hundido al 15 % se compensa con hermanos al 100 % y la puerta sigue
verde. El remedio es una entrada de umbral con la **ruta de ese fichero**, que funciona como
umbral por fichero sin activarlo para todo el repositorio.

```bash
node agente/tools/cobertura.mjs enmascarados
```

**Umbral aspiracional.** Un piso por encima de lo real deja la puerta en rojo permanente, y
una puerta siempre en rojo se apaga. Los umbrales arrancan en **lo medido hoy** y solo se
mueven hacia arriba.

```bash
node agente/tools/cobertura.mjs proponer    # los umbrales, medidos
node agente/tools/cobertura.mjs validar     # falla si alguno baja
```

> **Y la mutación, cuando quieras saber si los tests sirven.** La cobertura dice cuánto
> código se ejecuta; no dice si algo se comprueba. Un test que llama a la función y no
> afirma nada da 100 % y pasa con el código roto. Ver el pack `api-backend`.

---

## 7 · Ratchets — el trinquete

Un umbral que solo puede mejorar. Es lo que permite convivir con deuda **sin que crezca**,
en lugar de prohibirla de golpe y bloquear el trabajo.

| Ratchet típico | Qué gatea |
|---|---|
| Colores / sombras / radios crudos | valores literales fuera del sistema de tokens |
| Controles nativos sin envolver | `input`/`select`/`textarea` fuera de los componentes propios |
| Tamaño de archivo (LOC) | crecimiento de los componentes y routers dios |
| Literales sin traducir | texto visible sin pasar por `t(...)` |
| `any` / supresiones de tipo | erosión del tipado |
| Cobertura por capa | que las capas nuevas no bajen el listón |

**Cómo funciona.** `<ratchet>:baseline` guarda la cuenta actual. `<ratchet>:validate` falla
si la cuenta **sube**, y dice **qué ocurrencia concreta es nueva**. El motor genérico está
en `agente/tools/ratchet.sh`; los ocho detectores de frontend ya escritos y probados, en
`agente/packs/frontend-web/detectores/`.

```bash
agente/tools/ratchet.sh baseline colores "grep -rn 'bg-white\|text-gray-' src/"
agente/tools/ratchet.sh validate colores "grep -rn 'bg-white\|text-gray-' src/"
```

> Un ratchet que falla por crecimiento **deliberado y aceptado** se re-baseliniza,
> documentando por qué en el commit. **Nunca se re-baseliniza para esconder un descuido**
> — el día que eso se normaliza, el ratchet deja de medir nada.

Cada `AP-*` de `anti-patterns.md` con un detector fiable **debería acabar siendo un
ratchet**. Ese es el camino: hallazgo → patrón con ID → detector → ratchet → regresión
imposible.

---

## 8 · Recorrer lo que se tocó

Un test verde con la pantalla rota es un test que prueba otra cosa. Después de la puerta
automática, ejercitar el flujo real: si el cambio es de interfaz, mirarla; si es de datos,
leer una fila; si es de despliegue, desplegar.

---

## 9 · Decir el hueco

**¿Lo que cambié lo recorre algo de lo que acabo de correr?** Si no:

- un test nuevo, si el comportamiento se puede aislar;
- un verificador o una sonda, si depende del entorno;
- el recorrido manual **descrito paso a paso**, si no queda otra.

---

## 10 · La salida

Números, no adjetivos.

```
tipos OK · 461 unitarias · 156 e2e · 0 vulnerabilidades · sin ciclos · sin secretos · ratchets sin subir
A mano: alta de usuario y primer acceso, Chrome, 390 px
Sin cobertura automática: el arranque del contenedor — comprobado desplegando
```

«Todo bien» no es una salida. Un paso que no se pudo correr aparece con su motivo.
