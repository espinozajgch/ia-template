#!/usr/bin/env bash
# puerta.sh — descubre y ejecuta la puerta de calidad del proyecto.
#   sin argumentos : descubre y muestra qué correría
#   --run          : la corre entera (todos los subproyectos; para al primer fallo)
# Portable a bash 3.2 (el de macOS): sin mapfile ni arrays asociativos.
set -o pipefail
correr=false; [ "${1:-}" = "--run" ] && correr=true
RAIZ="$PWD"

echo "== Definición de CI (la fuente de verdad de la puerta) =="
hay_ci=false
for f in .github/workflows/*.y*ml .gitlab-ci.yml .circleci/config.yml Jenkinsfile azure-pipelines.yml; do
  [ -f "$f" ] || continue; hay_ci=true
  echo "  $f"
  grep -nE '^[[:space:]]*(run|script):' "$f" 2>/dev/null | head -12 | sed 's/^/    /'
done
$hay_ci || echo "  (sin definición de CI — la puerta no tiene fuente de verdad externa)"

MANIFIESTOS=$(find . -maxdepth 3 -name package.json -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next*' -not -path '*/out/*' -not -path '*/vendor/*' -not -path '*/.venv/*' 2>/dev/null | sort)

echo; echo "== Atajo canónico =="
ENCONTRADOS=""
while IFS= read -r m; do
  [ -n "$m" ] || continue
  d=$(dirname "$m")
  if node -e "process.exit((require('$RAIZ/${m#./}').scripts||{})['quality:check']?0:1)" 2>/dev/null; then
    echo "  ✓ (cd $d && npm run quality:check)"
    ENCONTRADOS="$ENCONTRADOS$d"$'\n'
  fi
done <<< "$MANIFIESTOS"

for f in Makefile justfile Taskfile.yml; do
  [ -f "$f" ] || continue
  obj=$(grep -oE '^(quality|check|verify)' "$f" 2>/dev/null | head -1)
  [ -n "$obj" ] && { echo "  ✓ make $obj"; ENCONTRADOS="$ENCONTRADOS.:make:$obj"$'\n'; }
done

if [ -z "$(printf '%s' "$ENCONTRADOS" | tr -d '[:space:]')" ]; then
  echo "  ✗ NO EXISTE un comando único que corra la puerta entera."
  echo "    Crearlo es la primera tarea del proyecto — ver agente/protocolo/02_PUERTA_DE_CALIDAD.md"
  echo; echo "== Piezas disponibles para componerlo =="
  while IFS= read -r m; do
    [ -n "$m" ] || continue
    echo "  $(dirname "$m"):"
    node -e "const s=require('$RAIZ/${m#./}').scripts||{};for(const k in s)console.log('    npm run '+k)" 2>/dev/null
  done <<< "$MANIFIESTOS"
  for f in Makefile justfile Taskfile.yml pyproject.toml; do
    [ -f "$f" ] && { echo "  $f:"; grep -E '^[a-zA-Z0-9_-]+:' "$f" 2>/dev/null | head -15 | sed 's/^/    /'; }
  done
  exit 1
fi

if $correr; then
  echo; echo "== Ejecutando =="
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    echo "--- $d"
    case "$d" in
      *:make:*) ( cd "${d%%:make:*}" && make "${d##*:make:}" ) ;;
      *)        ( cd "$d" && npm run quality:check ) ;;
    esac || { echo "✗ la puerta falló en $d"; exit 1; }
  done <<< "$ENCONTRADOS"
  echo "✓ la puerta pasó entera"
else
  echo; echo "  Para ejecutarla:  $0 --run"
fi
