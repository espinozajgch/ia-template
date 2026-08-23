# AGENTS.md — [NOMBRE DEL PROYECTO]

> **Fuente única de contexto para cualquier agente de IA.**
> Claude Code, Gemini/Antigravity, Cursor, Copilot, Windsurf y Codex leen este archivo
> a través de un puntero. **No dupliques su contenido en ningún otro sitio** — si algo
> vale para todos, va aquí; si vale para una sola herramienta, va en su puntero.
>
> Longitud objetivo: **menos de 250 líneas.** Lo que crezca por encima se saca a
> `knowledge/wiki/` y se enlaza. Un contexto que no se lee entero no es contexto.

---

## 1 · Qué es esto

**North Star.** [Una frase: el único resultado que el sistema debe lograr.]

**A quién sirve.** [Usuario real, no arquetipo. Qué dolor le quita.]

**Estado.** [prototipo | en desarrollo | producción con usuarios | mantenimiento]

---

## 2 · Stack y entradas

**Stack:** [lenguajes, frameworks, ORM, base de datos, hosting]

| Qué | Dónde |
|---|---|
| Entrada frontend | `[ruta]` |
| Entrada API | `[ruta]` |
| Esquema de datos | `[ruta]` |
| Despliegue | `[ruta]` |

---

## 3 · Mapa del repositorio

```text
[proyecto]/
├── knowledge/wiki/   fuente de verdad — leer ANTES de cambiar nada
├── agente/           protocolo, packs y prompts instalados
├── [código]/
└── [tests]/
```

Carpetas que **no se tocan** sin petición explícita: [`old/`, `legacy/`, `vendor/`…]

---

## 4 · Comandos

```bash
# instalar / arrancar
[comando]

# LA PUERTA DE CALIDAD — nada se da por hecho sin esto en verde
[comando]        # p. ej. npm run quality:check

# salud en producción
[comando]
```

> Si no existe un comando único que corra la puerta entera, **crearlo es la primera
> tarea del proyecto.** Ver `agente/protocolo/02_PUERTA_DE_CALIDAD.md`.

---

## 5 · Reglas que no se negocian

### 5.1 · Lo irreversible es del usuario

Nunca, sin petición explícita **en esta conversación**:

- `git push`, desplegar, abrir un PR, publicar en un servicio externo;
- escribir en producción — base de datos, almacenamiento, colas, envío de correo o mensajes;
- gastar dinero — contratar, subir de plan, provisionar infraestructura;
- borrar lo que no se creó en esta sesión;
- tocar credenciales — leerlas, imprimirlas, rotarlas, moverlas.

Commits **locales** sí están permitidos y son deseables. Autonomía es no preguntar por el
*cómo*; el *qué* sale del alcance acordado.

### 5.2 · Nada está hecho hasta que pasa la puerta

Definición de hecho completa: [`knowledge/wiki/definicion-de-hecho.md`](knowledge/wiki/definicion-de-hecho.md).
Resumen: criterio escrito **antes** · puerta de calidad entera en verde · el hueco de
cobertura **dicho** · documentación al día · commit local con el porqué.

«Hecho con una salvedad» no existe.

### 5.3 · Al encontrar una decisión que no es tuya

**No parar.** Anotarla en [`knowledge/wiki/decisiones-pendientes.md`](knowledge/wiki/decisiones-pendientes.md),
seguir con todo lo que no dependa de ella —que casi siempre es casi todo— y mencionarla
al final. Parar solo si de verdad no queda nada ejecutable sin esa respuesta.

### 5.4 · Anti-patrones con ID

Antes de implementar, consultar [`knowledge/wiki/anti-patterns.md`](knowledge/wiki/anti-patterns.md).
Los IDs `AP-*` se citan en commits, revisiones y auditorías.
La deuda ya aceptada vive en [`knowledge/wiki/architectural-debt.md`](knowledge/wiki/architectural-debt.md)
con ID `AD-*` y **no se re-reporta como hallazgo nuevo**.

### 5.5 · Restricciones propias del proyecto

[Lo que este sistema NO debe hacer nunca. Sale de la pregunta 5 del Blueprint.
Ejemplos: no inventar datos clínicos · no mostrar precios sin IVA · no escribir en la
tabla `X` desde el frontend · no llamar a la API `Y` más de N veces por minuto.]

---

## 6 · Cómo trabajar aquí

- **Leer antes de escribir.** Ficheros relevantes en paralelo, no de uno en uno.
- **Edición parcial.** Nunca reescribir un archivo entero salvo que cambie >80%.
- **No pegar en la respuesta** el código que ya se editó — el usuario ve el diff.
- **Descubrimiento de código:** grafo del código primero (`search_graph`, `trace_path`,
  `get_code_snippet`) si el MCP está activo; texto para literales, configuración y
  ficheros que no son código.
- **Números, no adjetivos.** «3.927 → 1.068 MB», no «mejora de memoria».
- **Sin preámbulos ni halagos.** Al trabajo.
- Un detector textual vacío **no prueba ausencia**.

---

## 7 · Trampas conocidas de este repositorio

> La sección que más tiempo ahorra. Cada entrada salió de un error real, no de una lista
> genérica. Ejemplos del tipo de cosa que va aquí:
> *«Hay dos bases de datos y `db:migrate` apunta a la que la app NO usa»*,
> *«`tsc --noEmit` pasa pero `npm run build` falla — usar siempre el build completo»*.

- [ ] [trampa 1]
- [ ] [trampa 2]

---

## 8 · Packs activos

| Pack | Cuándo lo consulta el agente |
|---|---|
| [`frontend-web`](agente/packs/frontend-web/PACK.md) | antes de crear o tocar cualquier componente visual |
| … | … |

Catálogo completo: `agente/packs/`. Prompts especializados: `agente/prompts/`.

---

## 9 · Índice de la fuente de verdad

| Archivo | Qué guarda |
|---|---|
| [`project.md`](knowledge/wiki/project.md) | Blueprint y registro de decisiones |
| [`features.md`](knowledge/wiki/features.md) | módulos, pantallas, flujos, estados |
| [`product-design.md`](knowledge/wiki/product-design.md) | marca, tokens, componentes, accesibilidad |
| [`definicion-de-hecho.md`](knowledge/wiki/definicion-de-hecho.md) | qué cuenta como hecho, cuándo parar |
| [`anti-patterns.md`](knowledge/wiki/anti-patterns.md) | catálogo `AP-*` |
| [`architectural-debt.md`](knowledge/wiki/architectural-debt.md) | deuda aceptada `AD-*` |
| [`decisions.md`](knowledge/wiki/decisions.md) | ADRs |
| [`decisiones-pendientes.md`](knowledge/wiki/decisiones-pendientes.md) | lo aparcado, sin bloquear |
| [`lessons.md`](knowledge/wiki/lessons.md) | correcciones del usuario ya aprendidas |
| [`glossary.md`](knowledge/wiki/glossary.md) | términos del dominio |
