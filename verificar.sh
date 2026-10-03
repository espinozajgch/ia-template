#!/usr/bin/env bash
# verificar.sh — la puerta de calidad DEL KIT. Un solo comando, y el que corre CI.
#
# ## Por qué existe
#
# Hasta el 2026-08-27 la lista de comprobaciones vivía en `AGENTS.md`, escrita a mano, y
# CI corría otra distinta. Dos listas divergen siempre, y ésta ya había divergido: la de
# `AGENTS.md` no incluía ni el detector de plantillas ni el de secretos.
#
# Es exactamente lo que este kit le pide a los proyectos que instala —«un solo comando
# que corre la puerta entera, y CI llama a ese mismo»— y no se lo aplicaba a sí mismo.
# Ver `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md`, que lo dice por escrito.
#
# ## Orden
#
# De lo barato a lo caro, y se corta en el primer fallo. Aquí todo es rápido, pero el
# orden importa igual: una herramienta que no compila no verifica nada, y descubrirlo
# tras cuatro pasos es tiempo tirado.
#
# Portable a bash 3.2, el de macOS: sin `mapfile`, sin arrays asociativos.
set -uo pipefail
cd "$(dirname "$0")"
KIT=$(pwd)   # ruta absoluta: las comprobaciones que cambian de directorio la necesitan

fallos=0
paso() { printf '\n─── %s\n' "$1"; }
mal()  { echo "  ✗ $1"; fallos=$((fallos + 1)); }

paso "sintaxis · las herramientas del kit compilan"
for f in tools/*.mjs nucleo/tools/*.mjs packs/*/*.mjs; do
  [ -f "$f" ] || continue
  node --check "$f" 2>/dev/null || mal "no compila: $f"
done
for f in verificar.sh instalar.sh nucleo/tools/*.sh packs/*/*.sh packs/*/*/*.sh; do
  [ -f "$f" ] || continue
  bash -n "$f" 2>/dev/null || mal "no compila: $f"
done
[ $fallos -eq 0 ] && echo "  ✓ todo compila"

paso "estructura · todo pack tiene su PACK.md"
# `instalar.sh` valida un pack comprobando que existe. Sin él no se puede instalar, y el
# fallo aparecería en la máquina de otro.
for d in packs/*/; do
  [ -f "$d/PACK.md" ] || mal "sin PACK.md: $d"
done
# La primera línea `**Se activa si:**` la lee `--packs`. Si cambia el formato, la lista
# sale vacía y nadie se entera — es una trampa documentada en AGENTS.md.
for d in packs/*/; do
  grep -q '^\*\*Se activa si:\*\*' "$d/PACK.md" || mal "sin «Se activa si:» en $d/PACK.md"
done
echo "  ✓ $(ls -d packs/*/ | wc -l | tr -d ' ') packs"

paso "estructura · las skills llevan su frontmatter"
for f in nucleo/skills/*/SKILL.md; do
  sed -n '2,4p' "$f" | grep -q '^name:' || mal "sin «name:» en $f"
done
echo "  ✓ $(ls -d nucleo/skills/*/ | wc -l | tr -d ' ') skills"

# Una skill vive en `nucleo/skills/X/` aquí y en `.claude/skills/X/` una vez instalada. Un
# enlace relativo que SALGA de la carpeta de skills no puede ser correcto en las dos
# disposiciones: `../../knowledge/...` apunta a `nucleo/knowledge/...` en el kit y a
# `.claude/knowledge/...` en el proyecto, y ninguno de los dos existe.
#
# Enlazar skills hermanas —`../auditar/SKILL.md`— sí funciona, porque esa estructura sí se
# conserva al instalar. Así que la regla es: hacia arriba, sólo un nivel.
#
# Encontrado el 2026-09-07 con un enlace al checklist que estaba roto en el kit Y en los dos
# proyectos donde ya se había instalado. Nada avisaba: un enlace roto en Markdown no falla,
# simplemente no lleva a ninguna parte.
paso "estructura · las skills no enlazan fuera de su carpeta"
for f in nucleo/skills/*/SKILL.md; do
  fuera=$(grep -oE '\]\(\.\./\.\./[^)]+\)' "$f" || true)
  [ -z "$fuera" ] || mal "$f enlaza fuera de skills/ y se romperá al instalar: $fuera"
  # Y los que suben un solo nivel tienen que existir de verdad.
  for enlace in $(grep -oE '\]\(\.\./[^)]+\)' "$f" | sed 's/^](//; s/)$//'); do
    [ -e "$(dirname "$f")/$enlace" ] || mal "$f enlaza a $enlace, que no existe"
  done
done
echo "  ✓ enlaces de skills"

paso "estructura · el JSON que se instala es JSON"
python3 -c "
import json,sys
for f in ['nucleo/hooks/settings.json','nucleo/mcp/.mcp.json']:
    try: json.load(open(f))
    except Exception as e: print('  ✗ %s: %s' % (f, e)); sys.exit(1)
" || mal "JSON inválido en nucleo/"

paso "estructura · el MCP de un pack es JSON, va fijado y no lleva credenciales"
# instalar.sh fusiona `packs/<p>/mcp.json` en el .mcp.json del proyecto: si está mal, rompe
# el de cada proyecto que elija el pack. Y como ese fichero se versiona, una ruta o un
# secreto escrito ahí se publica con el repositorio.
python3 -c "
import glob,json,re,sys
mal=False
for f in glob.glob('packs/*/mcp.json'):
    try: d=json.load(open(f))
    except Exception as e: print('  ✗ %s: %s' % (f, e)); mal=True; continue
    srv=d.get('mcpServers')
    if not isinstance(srv,dict) or not srv: print('  ✗ %s: sin mcpServers' % f); mal=True; continue
    for n,c in srv.items():
        args=' '.join(c.get('args',[]))
        if not re.search(r'(==|@)\d', args): print('  ✗ %s: «%s» no fija versión' % (f,n)); mal=True
        for k,v in (c.get('env') or {}).items():
            if not re.fullmatch(r'\\$\\{[A-Z0-9_]+(:-[^}]*)?\\}', str(v)): print('  ✗ %s: env %s no es \${VARIABLE}' % (f,k)); mal=True
sys.exit(1 if mal else 0)
" || mal "MCP de pack inválido"

paso "contenido · ningún ejemplo se hace pasar por propio"
node tools/plantillas.mjs . || mal "hay ejemplos rellenados sin advertir"

# ── Las herramientas no pueden aprobar lo que no han leído ────────────────────
#
# La convención del kit es: 0 = comprobado y bien · 1 = comprobado y hay problemas ·
# 2 = NO se pudo comprobar. Los tres estados importan por separado, y el tercero es el que se
# olvida: una herramienta que sale con 0 sin haber leído nada aprueba la puerta en silencio.
#
# Encontrado el 2026-09-08 instalando el kit en un proyecto nuevo y siguiendo, paso a paso, lo
# que el propio instalador manda ejecutar. `secretos.mjs` decía «✓ sin secretos (0 ficheros)»
# con código 0 teniendo un token de GitHub en el árbol, sólo porque nada se había hecho
# `git add` todavía — y es el PRIMER comando de esa lista. `tamano.mjs` y `ciclos.mjs` hacían
# lo mismo con una ruta inexistente, que en CI significa que renombrar `src` a `app` deja el
# verificador aprobando para siempre sin leer una línea.
#
# `cobertura.mjs` y `esquema.mjs` ya lo hacían bien. El kit era inconsistente consigo mismo.
# ── Instalación de verdad, y sus enlaces ──────────────────────────────────────
#
# Se instala el kit en un directorio temporal y se comprueban los enlaces ALLÍ. Es la única
# forma de cazar la clase de fallo que más veces se ha repetido: un fichero de `nucleo/` o
# `packs/` cuyo enlace relativo resuelve bien AQUÍ y apunta a la nada una vez instalado.
#
# Tres veces en dos días: el enlace de `preproduccion` al checklist, las cuatro referencias a
# skills de `00_CICLO.md`, y las rutas del checklist a `packs/`. Ninguna se veía desde el kit.
#
# De paso, esto ejercita el instalador entero: si `instalar.sh` se rompe, la puerta se entera.
paso "instalación · el kit instalado no tiene enlaces rotos"
tmp_inst=$(mktemp -d)
(cd "$tmp_inst" && git init -q)
if ./instalar.sh "$tmp_inst" frontend-web api-backend seguridad >/dev/null 2>&1; then
  node tools/enlaces.mjs "$tmp_inst" || mal "enlaces rotos en el proyecto instalado"
else
  mal "instalar.sh falló sobre un proyecto limpio"
fi
rm -rf "$tmp_inst"

paso "herramientas · ninguna aprueba lo que no ha leído"
tmp_vacio=$(mktemp -d)
(cd "$tmp_vacio" && git init -q && mkdir -p vacia)
for prueba in "secretos.mjs" "tamano.mjs baseline vacia" "ciclos.mjs vacia" \
              "cobertura.mjs proponer" "esquema.mjs sellar"; do
  # shellcheck disable=SC2086
  (cd "$tmp_vacio" && node "$KIT/nucleo/tools/"$prueba >/dev/null 2>&1)
  codigo=$?
  [ "$codigo" = 2 ] || mal "$prueba sale con $codigo sin nada que analizar (debe ser 2)"
done
rm -rf "$tmp_vacio"
echo "  ✓ 5 herramientas distinguen «bien» de «no comprobado»"

paso "seguridad · sin secretos"
node nucleo/tools/secretos.mjs . || mal "posible secreto"

echo
if [ $fallos -gt 0 ]; then
  echo "  Puerta en ROJO: $fallos fallo(s)."
  echo "  Nada está hecho hasta que pasa."
  exit 1
fi
echo "  Puerta en verde."
