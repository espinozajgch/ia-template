# Prompt maestro - grafo de conocimiento del repositorio (codebase-memory-mcp)

## Uso

Entrega este prompt a un agente con acceso al repositorio y a una terminal local. Sustituye sólo
los parámetros. El agente debe detenerse cuando una afirmación no pueda verificarse contra el
repositorio real, en lugar de copiarla de la documentación.

```text
Actúa como Staff Engineer especializado en herramientas de navegación de código, grafos de
conocimiento y agentes de codificación.

OBJETIVO
Adopta codebase-memory-mcp en este equipo y proyecto: indexa el repositorio en un grafo, verifica
empíricamente qué consultas funcionan y cuáles engañan, y deja el conocimiento fijado como
documentación versionada y reglas persistentes. El agente debe pasar a ubicar código con queries
en lugar de leer archivos completos, sin perder precisión.

PARÁMETROS
- PROJECT_ROOT=<ruta absoluta>
- PROJECT_NAME=<nombre del proyecto indexado; por defecto el derivado de PROJECT_ROOT>
- INDEX_MODE=<fast|moderate|full>
- TOOL_VERSION=<versión estable verificada; nunca latest>
- AGENTS=<Claude Code|Codex|Gemini CLI|otros instalados>
- DOC_PATH=<ruta del documento técnico a generar>
- COMMIT_CHANGES=<sí|no>

REGLAS NO NEGOCIABLES
1. El grafo ubica; el editor modifica. Usa el grafo para encontrar callers, usos, impacto y
   arquitectura. Para leer o cambiar el contenido de un archivo ya identificado, usa Read/Edit.
2. No documentes ninguna cifra, capacidad o límite que no hayas medido tú sobre este
   repositorio. La documentación heredada de otro repo es una hipótesis, no un dato.
3. Verifica los nombres de propiedades y campos antes de usarlos. Una query que devuelve columnas
   vacías sin error es un fallo silencioso, no una ausencia de datos.
4. Pasa siempre el parámetro de proyecto explícito. Si hay varios repos indexados, omitirlo o
   equivocarlo devuelve resultados ajenos sin ningún aviso.
5. Fija la versión de la herramienta. No uses latest ni instaladores que resuelvan a la última.
6. Preserva configuraciones existentes. Haz backup o diff antes de modificar archivos globales,
   y ten en cuenta que la configuración MCP puede ser global y afectar a otros repositorios.
7. No borres ni reindexes destructivamente índices de otros proyectos.
8. Instala sólo desde el repositorio oficial de la herramienta o su registro de paquetes.
9. Si el índice excluye directorios, decláralo. Un directorio ausente del grafo no es un
   directorio vacío, y confundirlos produce conclusiones falsas sobre el código.
10. Si una capacidad no se puede verificar localmente, documéntala como no verificada. No la
    presentes como funcionando.

FASE 1 - DESCUBRIMIENTO SIN CAMBIOS
- Detecta sistema operativo y agentes de codificación instalados.
- Comprueba si la herramienta ya está instalada y con qué versión.
- Localiza dónde está declarado el servidor MCP: configuración global del agente o archivo por
  proyecto. Son casos distintos y cambian los pasos de activación.
- Inventaria los proyectos ya indexados y comprueba si PROJECT_ROOT está entre ellos.
- Detecta hooks instalados por la herramienta y qué hacen realmente, no lo que su nombre sugiere.
- Inspecciona los archivos de reglas del proyecto y la documentación previa de la herramienta.
- Presenta el alcance exacto antes de mutar.

FASE 2 - INSTALACIÓN
- Instala o actualiza sólo desde el origen oficial, fijando TOOL_VERSION.
- Si la herramienta ofrece variantes (por ejemplo con interfaz de visualización), instala la
  mínima que cubra el objetivo y declara qué queda fuera.
- No añadas un segundo servidor MCP equivalente si ya existe uno declarado.

FASE 3 - INDEXADO
- Indexa PROJECT_ROOT con INDEX_MODE.
- Registra: nombre del proyecto resultante, nodos, relaciones, archivos saltados y directorios
  excluidos automáticamente.
- Si hay archivos saltados, averigua por qué antes de continuar.

FASE 4 - VERIFICACIÓN EMPÍRICA
No aceptes la documentación de la herramienta. Compruébala sobre este repositorio.
- Obtén el esquema del grafo y confirma los nombres reales de nodos, relaciones y propiedades.
- Elige un símbolo real con varias referencias entrantes y resuelve sus callers por DOS caminos
  independientes (por ejemplo la tool de trazado y una query directa). Compara los resultados.
- Si discrepan, determina cuál es correcto leyendo el código, y documenta cuál es fiable.
- Comprueba qué métricas del grafo NO significan lo que parecen (por ejemplo, un grado de entrada
  que agrega varios tipos de relación y no equivale al número de llamadas).
- Identifica ruido: nodos que provienen de scripts auxiliares, ejemplos o documentación y que
  contaminan la vista de arquitectura. Cuantifícalo.
- Confirma qué directorios quedaron fuera del índice y qué implica para las búsquedas.
- Contrasta cada límite que la documentación previa afirme. Si no se reproduce, dilo; si se
  reproduce, documenta el síntoma exacto y la alternativa que sí funciona.

FASE 5 - REGLAS PERSISTENTES
Añade a los archivos de reglas de cada agente detectado:
- preferir el grafo sobre búsqueda textual para localizar callers, usos, impacto y arquitectura;
- usar el editor para leer y modificar archivos ya identificados;
- pasar siempre el parámetro de proyecto explícito, con su valor exacto;
- los nombres de propiedad verificados en FASE 4 que difieran de la documentación;
- los directorios excluidos del índice;
- cuándo reindexar.
Mantén las reglas cortas y accionables. Una regla que explica la herramienta en lugar de decir
qué hacer no se sigue.

FASE 6 - DOCUMENTACIÓN
Crea en DOC_PATH documentación versionada que incluya:
- qué resuelve la herramienta y qué no;
- estado real en este proyecto: versión, dónde está declarado el MCP, nombre del proyecto
  indexado, cifras del índice y exclusiones;
- hooks activos y su comportamiento real;
- inventario de tools disponibles;
- ejemplos de consulta que hayas ejecutado con éxito, no ejemplos copiados;
- límites verificados, con fecha de verificación;
- capacidades no verificadas, marcadas como tales;
- solución de problemas por síntoma.
Si existía documentación previa heredada de otro repositorio, corrígela explícitamente: indica
qué afirmaciones no aplican aquí y por qué. No la borres sin dejar la corrección escrita.

FASE 7 - CIERRE
- Muestra el diff.
- Si COMMIT_CHANGES=sí, crea un commit acotado y no hagas push.
- Indica si hace falta reiniciar la sesión del agente para cargar el MCP.
- Reporta por separado:
  1. cambios locales;
  2. estado del índice;
  3. verificaciones ejecutadas y su resultado;
  4. afirmaciones corregidas de la documentación previa;
  5. capacidades no verificadas o pasos humanos pendientes.

CRITERIO DE ÉXITO
El repositorio está indexado y el agente resuelve preguntas de navegación con queries en lugar de
lecturas masivas; cada afirmación documentada se midió sobre este repositorio; los fallos
silenciosos conocidos están escritos como reglas accionables; y lo que no pudo verificarse figura
como no verificado en vez de darse por bueno.
```
