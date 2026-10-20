# Pack · estudio-marca

**Se activa si:** hace falta analizar o diseñar la identidad visual de una marca —valores,
color actual, una paleta nueva— con evidencia y cifras, no con gusto personal.

---

## Qué es esto

Siete skills que convierten un encargo de marca en cuatro entregables, cada uno con su
prueba:

1. **Valores de marca**: los que declara y los que el producto demuestra.
2. **Auditoría de la identidad de color**: lo que hay en el código frente a lo documentado.
3. **Rutas de paleta**: varias opciones estratégicas, cada una con color principal, dos
   acentos, neutro oscuro y neutro claro, validadas en accesibilidad.
4. **Síntesis**: una opción que combina lo mejor de otras y resuelve sus puntos débiles.

El proyecto que se analiza puede ser este mismo repositorio o uno externo (ruta local o
URL) — el estudio siempre es de **solo lectura** sobre él; ver §1 de las reglas.

## Qué instala

| Skill | Etapa | Entrega en `knowledge/estudios-marca/<slug>/` |
|---|---|---|
| `estudio-marca` | 0 · Encargo — punto de entrada, decide la etapa | `brief.md` |
| `valores-marca` | 1 · Valores | `01-valores.md` |
| `auditoria-color` | 2 · Color actual | `02-auditoria-color.md` |
| `paleta-marca` | 3 · Primera paleta | `paleta.json` (opción A) |
| `rutas-paleta` | 4 · Rutas | `paleta.json` (opciones B, C…) |
| `sintesis-paleta` | 5 · Síntesis | `paleta.json` (opción combinada) |
| `hoja-paleta` | 6 · Entregable | `hoja-paleta.html` |

Cada etapa usa lo anterior. Se puede entrar por cualquiera si lo anterior ya existe —la
skill `estudio-marca` decide y, si falta un escalón, lo hace antes en versión breve, sin
preguntar.

Más `agente/packs/estudio-marca/metodo/` (criterios de experto que las skills leen antes
de opinar: roles de color, umbrales WCAG, cómo se diseñan rutas, cómo se sintetiza, catálogo
`AP-M*`), `herramientas/` (`color.py` y `hoja_paleta.py` — cálculo, nunca a mano) y
`plantillas/` (estructura de cada entregable). `encargos.md` trae el texto para lanzar cada
etapa en un agente que no descubre skills solo (Cursor, Copilot, Windsurf, Codex).

## Si también tenés el pack `marketing-contenido`

Sus subagentes `marketing` y `disenador` leen los entregables de este pack como fuente de
verdad: `01-valores.md` para qué valor expresa cada pieza de contenido, `paleta.json` para
qué color usar — en vez de improvisar una paleta o un tono de marca distinto cada vez que
hace falta una pieza nueva. Corré `estudio-marca` primero si todavía no existe ninguno de
los dos; después, cada campaña o pieza de contenido parte de ahí.

## Comandos

```bash
# Cálculos (sin dependencias, Python 3.9+)
python3 agente/packs/estudio-marca/herramientas/color.py contraste "#2169de" "#f4f7fb"
python3 agente/packs/estudio-marca/herramientas/color.py daltonismo "#3d6aad" "#603eb8"
python3 agente/packs/estudio-marca/herramientas/color.py estados "#603eb8" --estados "éxito=#047857,aviso=#c2410c,error=#b91c1c,información=#0c4a6e"
python3 agente/packs/estudio-marca/herramientas/color.py buscar --tono 256 --restriccion "#f7f6f3:4.5" --restriccion "#14181f:3" --sat 40-60
python3 agente/packs/estudio-marca/herramientas/color.py variante "#2169de" --fondo "#0b1626" --min 7
python3 agente/packs/estudio-marca/herramientas/color.py extraer /ruta/al/proyecto
python3 agente/packs/estudio-marca/herramientas/color.py muestra-png /ruta/icono.png 3,3 90,5

# La puerta de calidad de una paleta: sin errores, no se entrega
python3 agente/packs/estudio-marca/herramientas/color.py validar knowledge/estudios-marca/<slug>/paleta.json

# El entregable se genera, nunca se escribe a mano
python3 agente/packs/estudio-marca/herramientas/hoja_paleta.py knowledge/estudios-marca/<slug>/paleta.json
```

## Reglas que no se negocian

Además de `AGENTS.md` §5 del proyecto (irreversibilidad, puerta de calidad), este pack
añade las suyas — nacidas de un caso real, no genéricas:

1. **El proyecto analizado es de solo lectura.** Se lee su código, su documentación y su
   web. No se modifica nada sin petición expresa en la conversación: ni tokens, ni CSS, ni
   documentación. Proponer no es aplicar.
2. **Ninguna cifra a mano.** Contrastes, distancias de tono, ΔE y croma salen de
   `herramientas/`. Una cifra escrita de memoria es un error aunque acierte.
3. **Evidencia antes que adjetivos.** Cada valor de marca lleva su prueba en el producto
   (fichero, texto de la web, funcionalidad). Cada afirmación sobre el color actual lleva
   `fichero:línea`. Un claim de mercado sin fuente se formula como tendencia, nunca como
   hecho.
4. **Honestidad sobre los contras.** Ninguna paleta carece de contras. Se separan siempre
   tres cosas: puntos débiles de diseño (se resuelven), costes inherentes a la ruta (se
   asumen) y reglas de uso (se cumplen). Prometer "sin contras" está prohibido.
5. **Corregir en cuanto un dato contradice lo dicho.** Si una medición posterior desmiente
   algo ya afirmado, se corrige en el entregable y en la respuesta, con la cifra.
6. **Lo irreversible es del usuario.** Publicar, compartir, enviar o aplicar cambios en el
   proyecto analizado requiere petición expresa. Crear y editar ficheros dentro de
   `knowledge/estudios-marca/<slug>/` sí está permitido.

## Trampas conocidas del dominio

- **La documentación de marca miente sin querer.** Un color documentado y el código pueden
  decir cosas distintas, y a veces una tercera capa (la web pública) dice una tercera.
  Contrasta siempre con `color.py extraer`.
- **Todos los tonos están ocupados por categorías.** Las paletas categóricas (`--cat-*`)
  cubren casi todo el círculo. El criterio que importa son los **estados semánticos**
  (éxito, aviso, error, información), no las categorías.
- **La saturación HSL engaña en colores muy oscuros.** Un azul casi negro puede dar 20%+ de
  saturación HSL y seguir siendo, perceptualmente, un neutro. Las herramientas usan croma
  CIELAB para detectar neutros.
- **Con neutros reales, un color no es texto AA en claro y en oscuro a la vez.** Es
  aritmética, no un defecto de la paleta — por eso cada cromático lleva variante para el
  fondo que no cumple.
- **Dos acentos con la misma luminosidad se separan solo por tono**, y con daltonismo
  pueden juntarse. Mide con `color.py daltonismo` antes de prometer que se distinguen.

## Cómo trabajar aquí

- **Leer `metodo/` antes de opinar.** Ahí están los criterios de experto.
- **Anti-patrones:** `metodo/anti-patrones.md`, catálogo `AP-M*`, se citan al corregir.
- **Escribir para quien lee.** Los entregables son para el equipo del cliente: frases
  cortas, voz activa, sin jerga sin explicar.
- **Registro:** español neutro con tuteo. Nunca voseo.
- **Números, no adjetivos:** "1,58 → 3,27:1", no "mejora mucho el contraste".
- **Una recomendación, no un catálogo.** Tras comparar opciones, se recomienda una y se
  dice para quién sería mejor la alternativa.

## Checklist

- [ ] Ningún valor de marca sin prueba referenciada
- [ ] Cada color del color actual lleva `fichero:línea`
- [ ] `color.py validar` sin errores antes de entregar cualquier paleta
- [ ] Ninguna cifra del entregable escrita a mano — reproducible con `herramientas/`
- [ ] Ninguna paleta presentada como "sin contras"
- [ ] La hoja HTML se generó con `hoja_paleta.py`, nunca editada a mano
- [ ] No se modificó nada del proyecto analizado sin petición expresa
