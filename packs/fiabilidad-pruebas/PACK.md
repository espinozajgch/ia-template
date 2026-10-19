# Pack · fiabilidad-pruebas

**Se activa si:** la suite de pruebas corre en una integración continua distinta de la
máquina donde se escribió, y alguna vez ha pasado en local y ha fallado (o mentido) allí.

**Sale de** un proyecto donde 146 commits se empujaron sin pasar nunca por integración
continua: la primera corrida destapó cuatro variantes del mismo fallo, todas con la misma
firma — verde en el portátil, imposible en cualquier otra parte.

---

## Por qué este pack existe

El kit ya trae trinquetes para tamaño, ciclos, secretos, esquema y cobertura **agregada**.
Ninguno cazaba dos problemas que, en la cantera de proyectos de este kit, han sido los más
caros de encontrar:

1. una prueba que solo puede pasar en la máquina de quien la escribió;
2. un fichero crítico hundido en cobertura que el número global no delata, porque el resto
   del repositorio lo compensa.

Los dos comparten forma: el agregado — «todo verde», «92% de cobertura» — es verdad y
esconde el problema al mismo tiempo.

---

## Qué instala

| Fichero | Qué resuelve |
|---|---|
| `entorno-pruebas.mjs` | pruebas atadas a la máquina: conexiones locales escritas a mano, solapes de tiempo sin techo |
| `suelo-cobertura.mjs` | un mínimo de cobertura por fichero, para lo que el trinquete global tapa |

---

## 1 · `entorno-pruebas.mjs`

```bash
node agente/packs/fiabilidad-pruebas/entorno-pruebas.mjs tests
```

Dos reglas por defecto:

- **Conexión local escrita a mano.** `usuario@localhost:5432` o un `postgresql://…localhost…`
  sin un `process.env` alrededor. No se prohíbe el respaldo
  (`process.env.X ?? "...localhost..."`); se prohíbe no leer ninguna variable.
- **Solape coordinado con un reloj.** `setTimeout` de más de diez milisegundos junto a
  `Promise.all`, sin un `Promise.race` que lo acote. Mide una ventana de tiempo, no un
  comportamiento, y en una máquina cargada la ventana no se cumple.

### Patrones propios del proyecto

El caso que lo motivó era más preciso que la regla genérica: una prueba se conectaba como
`pulso_app@` y no leía `APP_DATABASE_URL`. Eso es conocimiento del proyecto —el nombre del
usuario, el nombre de la variable correcta— que la herramienta no puede adivinar. Se añade
con `--patron`:

```bash
node agente/packs/fiabilidad-pruebas/entorno-pruebas.mjs tests \
  --patron 'identidad=pulso_app@(?!.*APP_DATABASE_URL)'
```

### Escape explícito

```js
/* trinquete-entorno: permitido — <por qué esto sí puede correr en cualquier sitio> */
```

---

## 2 · `suelo-cobertura.mjs`

```bash
node agente/packs/fiabilidad-pruebas/suelo-cobertura.mjs vigilar scripts/avisos.mjs
node agente/packs/fiabilidad-pruebas/suelo-cobertura.mjs validar
node agente/packs/fiabilidad-pruebas/suelo-cobertura.mjs fijar
```

Lee `coverage/lcov.info` (ruta en `$LCOV`) y guarda un mínimo por fichero en
`.ratchets/cobertura-suelo.json`. No vigila todo el repositorio — solo lo que se declara con
`vigilar`, y lo que entra en esa lista es lo que duele cuando falla en silencio: el único
camino por el que algo crítico llega a producción, no el promedio del repositorio.

**Calíbralo en el entorno más estricto que lo valide — la integración continua, no tu
portátil.** La cobertura de un mismo fichero no es la misma en los dos: la base sembrada
difiere, y en local suele haber datos de demostración que ejecutan ramas que en integración
no existen.

---

## Lo que hay que decidir en cada proyecto

| Decisión | Notas |
|---|---|
| Qué ficheros vigilar en `suelo-cobertura` | los que, si fallan en silencio, no los compensa nadie más |
| Patrones propios de `entorno-pruebas` | el nombre de usuario/host de la base de datos de pruebas, si aplica |
| Dónde corre `$LCOV` | por defecto `coverage/lcov.info`; ajustar si el runner de pruebas usa otra ruta |

---

## Checklist

- [ ] `entorno-pruebas.mjs` corre en la puerta de calidad, no solo en local
- [ ] Todo patrón propio tiene su `--patron` documentado aquí o en `knowledge/wiki/`
- [ ] Al menos el fichero más crítico del dominio está `vigilar`-ado en `suelo-cobertura`
- [ ] El suelo se calibró leyendo el número de la integración continua, no el del portátil
