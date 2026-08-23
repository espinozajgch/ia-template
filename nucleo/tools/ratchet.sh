#!/usr/bin/env bash
# ratchet.sh — trinquete genérico de calidad: un umbral que solo puede mejorar.
#
#   ratchet.sh baseline <nombre> '<comando que lista las ocurrencias>'
#   ratchet.sh validate <nombre> '<comando que lista las ocurrencias>'
#   ratchet.sh report
#
# El comando debe escribir UNA LÍNEA POR OCURRENCIA en stdout. Se cuentan las líneas.
# La baseline se guarda en .ratchets/<nombre>.
#
# Ejemplo:
#   ratchet.sh baseline colores "grep -rn 'bg-white\|text-gray-' src/"
#   ratchet.sh validate colores "grep -rn 'bg-white\|text-gray-' src/"
set -uo pipefail

DIR="${RATCHET_DIR:-.ratchets}"
accion="${1:-}"; nombre="${2:-}"; comando="${3:-}"

contar() { eval "$comando" 2>/dev/null | grep -c . || true; }

case "$accion" in
  baseline)
    [ -z "$nombre" ] || [ -z "$comando" ] && { echo "uso: $0 baseline <nombre> '<comando>'" >&2; exit 2; }
    mkdir -p "$DIR"
    n=$(contar)
    printf '%s\n%s\n' "$n" "$comando" > "$DIR/$nombre"
    eval "$comando" 2>/dev/null | sort > "$DIR/$nombre.lista"
    echo "ratchet '$nombre' fijado en $n"
    echo "Documenta en el commit POR QUÉ se re-baseliniza. Nunca para esconder un descuido." ;;

  validate)
    [ -z "$nombre" ] && { echo "uso: $0 validate <nombre> ['<comando>']" >&2; exit 2; }
    [ -f "$DIR/$nombre" ] || { echo "✗ ratchet '$nombre' sin baseline. Corre: $0 baseline $nombre '<comando>'" >&2; exit 1; }
    base=$(head -1 "$DIR/$nombre")
    [ -z "$comando" ] && comando=$(sed -n '2p' "$DIR/$nombre")
    n=$(contar)
    if   [ "$n" -gt "$base" ]; then
      echo "✗ $nombre: $base → $n (+$((n-base))). El trinquete solo puede bajar."
      if [ -f "$DIR/$nombre.lista" ]; then
        echo "  Ocurrencias nuevas (no estaban en la baseline):"
        eval "$comando" 2>/dev/null | sort | comm -23 - "$DIR/$nombre.lista" | sed 's/^/    /'
      fi
      exit 1
    elif [ "$n" -lt "$base" ]; then
      echo "✓ $nombre: $base → $n (-$((base-n))). Re-baseliniza para consolidar: $0 baseline $nombre"
    else
      echo "✓ $nombre: $n (sin cambios)"
    fi ;;

  report)
    [ -d "$DIR" ] || { echo "sin ratchets definidos"; exit 0; }
    printf '%-28s %8s %8s\n' RATCHET BASELINE ACTUAL
    for f in "$DIR"/*; do
      [ -f "$f" ] || continue
      nombre=$(basename "$f"); base=$(head -1 "$f"); comando=$(sed -n '2p' "$f")
      n=$(contar)
      printf '%-28s %8s %8s %s\n' "$nombre" "$base" "$n" \
        "$([ "$n" -gt "$base" ] && echo '✗ SUBIÓ' || { [ "$n" -lt "$base" ] && echo '✓ bajó' || echo '='; })"
    done ;;

  *) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
