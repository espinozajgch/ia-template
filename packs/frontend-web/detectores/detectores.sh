#!/usr/bin/env bash
# detectores.sh — los ocho ratchets de frontend, listos para usar.
#   detectores.sh instalar   fija la línea base de todos
#   detectores.sh validar    los comprueba todos (código 1 si alguno subió)
#   detectores.sh estado     tabla comparativa
#   detectores.sh listar     enseña los comandos sin ejecutar nada
#
# Ajusta SRC y las extensiones si tu proyecto no usa src/ ni .tsx.
set -o pipefail
SRC="${SRC:-src}"
UI_DIR="${UI_DIR:-src/components/ui|src/design-system|src/shared/form}"
TOKENS="${TOKENS:-(tokens|theme|variables|design-system)\.(css|ts)}"
RATCHET="${RATCHET:-agente/tools/ratchet.sh}"
[ -x "$RATCHET" ] || RATCHET="$(dirname "${BASH_SOURCE[0]}")/../../../nucleo/tools/ratchet.sh"

nombres=(colores sombras inputs-nativos radios loc-tsx literales-i18n supresiones)
comandos=(
  "grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(bg|text|border)-(white|black|gray|slate|zinc|neutral|stone)-[0-9]{2,3}\b' $SRC --include='*.tsx' --include='*.jsx' --include='*.css' | grep -vE '$TOKENS'"
  "grep -rnE 'box-shadow:|(^|[ \"'\''])shadow-(sm|md|lg|xl|2xl)\b' $SRC --include='*.tsx' --include='*.css'"
  "grep -rnE '<(input|select|textarea)[ >]' $SRC --include='*.tsx' | grep -vE '$UI_DIR'"
  "grep -rnE 'rounded-lg' $SRC --include='*.tsx' | grep -E '<(button|a |input|select)|role=\"(button|tab|menuitem)\"'"
  "find $SRC -name '*.tsx' -size +12k"
  "grep -rnE '>[^<>{}]*[áéíóúñÁÉÍÓÚÑ¿¡][^<>{}]*<' $SRC --include='*.tsx'"
  "grep -rnE '@ts-nocheck|@ts-ignore|:[[:space:]]*any\b|# type: ignore' $SRC --include='*.ts' --include='*.tsx' --include='*.py'"
)

case "${1:-}" in
  listar)
    for i in "${!nombres[@]}"; do printf '\n── %s\n   %s\n' "${nombres[$i]}" "${comandos[$i]}"; done ;;
  instalar)
    echo "Fijando líneas base sobre el estado actual de $SRC/"
    for i in "${!nombres[@]}"; do bash "$RATCHET" baseline "${nombres[$i]}" "${comandos[$i]}" | head -1; done
    echo
    echo "Listo. Añade a package.json:"
    echo '  "ratchets": "bash agente/packs/frontend-web/detectores/detectores.sh validar"' ;;
  validar)
    fallo=0
    for i in "${!nombres[@]}"; do bash "$RATCHET" validate "${nombres[$i]}" "${comandos[$i]}" || fallo=1; done
    [ $fallo -eq 0 ] && echo && echo "✓ los ${#nombres[@]} ratchets en su sitio"
    exit $fallo ;;
  estado)  bash "$RATCHET" report ;;
  *) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
