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

paso "estructura · el JSON que se instala es JSON"
python3 -c "
import json,sys
for f in ['nucleo/hooks/settings.json','nucleo/mcp/.mcp.json']:
    try: json.load(open(f))
    except Exception as e: print('  ✗ %s: %s' % (f, e)); sys.exit(1)
" || mal "JSON inválido en nucleo/"

paso "contenido · ningún ejemplo se hace pasar por propio"
node tools/plantillas.mjs . || mal "hay ejemplos rellenados sin advertir"

paso "seguridad · sin secretos"
node nucleo/tools/secretos.mjs . || mal "posible secreto"

echo
if [ $fallos -gt 0 ]; then
  echo "  Puerta en ROJO: $fallos fallo(s)."
  echo "  Nada está hecho hasta que pasa."
  exit 1
fi
echo "  Puerta en verde."
