#!/usr/bin/env bash
# instalar.sh — instala el kit en un proyecto.
#
#   ./instalar.sh <ruta-al-proyecto> [pack ...] [--force] [--sin-hooks] [--sin-mcp]
#   ./instalar.sh --packs                 lista los packs disponibles
#
# Instala SIEMPRE el núcleo. Instala SOLO los packs que se piden: un pack que no aplica
# es contexto que el agente lee y no sirve.
#
# Es idempotente y NO sobrescribe nada que ya exista, salvo con --force. Los ficheros que
# ya estaban se saltan y se reportan al final: el kit nunca pisa el trabajo del proyecto.
set -uo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# pack → prompts que necesita
prompts_de_pack() { case "$1" in
  frontend-web)        echo "DESIGN_PROMPT.md" ;;
  api-backend)         echo "ARCHITECTURE_PROMPT.md APPSEC_PROMPT.md" ;;
  base-de-datos)       echo "DATABASE_PROMPT.md" ;;
  seguridad)           echo "APPSEC_PROMPT.md SECURITY_PROMPT.md FORENSIC_AUDITOR_PROMPT.md" ;;
  cloud-aws)           echo "AWS_AGENT_TOOLKIT_PROMPT.md DEVSECOPS_PROMPT.md CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md INFRA_ACCESS_PROMPT.md" ;;
  cloud-agnostico)     echo "CLOUD_AGNOSTIC_PROMPT.md DEVSECOPS_PROMPT.md" ;;
  datos-rag)           echo "RAG_PROMPT.md" ;;
  pwa-movil)           echo "PWA_PROMPT.md DESIGN_PROMPT.md" ;;
  saas-multitenant)    echo "SAAS_PRODUCT_PROMPT.md" ;;
  i18n)                echo "I18N_PROMPT.md" ;;
  bot-automatizacion)  echo "" ;;
  app-ia)              echo "" ;;
  monorepo)            echo "" ;;
  facturacion)         echo "" ;;
  ingesta-datos)       echo "" ;;
  offline-first)       echo "" ;;
  notificaciones)      echo "" ;;
  design-system)       echo "DESIGN_PROMPT.md" ;;
  informes-pdf)        echo "" ;;
  observabilidad)      echo "" ;;
  datos-personales)    echo "" ;;
  auditoria-informes)  echo "FORENSIC_AUDITOR_PROMPT.md AUDITOR_FORENSE.md AUDIT_PROMPT.md STAFF_PROMPT.md" ;;
  # Un pack sin prompts propios no necesita línea: basta con que exista su carpeta.
  # Antes esta lista era la ÚNICA verdad y `--packs` leía el directorio, así que al añadir
  # un pack el instalador lo listaba y luego lo rechazaba por desconocido. Dos vistas de lo
  # mismo que se pueden desincronizar acaban desincronizadas.
  *) [ -f "$KIT/packs/$1/PACK.md" ] && echo "" || return 1 ;;
esac; }

if [ "${1:-}" = "--packs" ]; then
  echo "Packs disponibles:"
  for d in "$KIT"/packs/*/; do
    n=$(basename "$d"); printf "  %-20s %s\n" "$n" "$(grep -m1 '^\*\*Se activa si:\*\*' "$d/PACK.md" | sed 's/\*\*Se activa si:\*\* //')"
  done; exit 0
fi

DESTINO="${1:-}"; shift || true
[ -z "$DESTINO" ] && { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
[ -d "$DESTINO" ] || { echo "✗ no existe el directorio: $DESTINO" >&2; exit 1; }
DESTINO="$(cd "$DESTINO" && pwd)"

FORCE=false; HOOKS=true; MCP=true; PACKS=()
for a in "$@"; do case "$a" in
  --force) FORCE=true ;; --sin-hooks) HOOKS=false ;; --sin-mcp) MCP=false ;;
  --*) echo "✗ opción desconocida: $a" >&2; exit 2 ;;
  *) prompts_de_pack "$a" >/dev/null || { echo "✗ pack desconocido: $a  (ver --packs)" >&2; exit 2; }; PACKS+=("$a") ;;
esac; done

NUEVOS=0; SALTADOS=()
poner() { # poner <origen> <destino-relativo>
  local src="$1" dst="$DESTINO/$2"
  [ -e "$src" ] || return 0
  mkdir -p "$(dirname "$dst")"
  if [ -e "$dst" ] && ! $FORCE; then SALTADOS+=("$2"); return 0; fi
  cp -R "$src" "$dst"; NUEVOS=$((NUEVOS+1)); echo "  + $2"
}

echo "Instalando el kit en $DESTINO"; echo
echo "NÚCLEO"
poner "$KIT/nucleo/AGENTS.md" "AGENTS.md"
for p in CLAUDE.md GEMINI.md .windsurfrules; do poner "$KIT/nucleo/punteros/$p" "$p"; done
poner "$KIT/nucleo/punteros/.cursor/rules/core.mdc"      ".cursor/rules/core.mdc"
poner "$KIT/nucleo/punteros/.github/copilot-instructions.md" ".github/copilot-instructions.md"
poner "$KIT/nucleo/punteros/.agents/rules/project.md"    ".agents/rules/project.md"

echo "SKILLS  (mismo contenido para Claude Code y para Antigravity)"
for s in "$KIT"/nucleo/skills/*/; do n=$(basename "$s")
  poner "$s/SKILL.md" ".claude/skills/$n/SKILL.md"
  poner "$s/SKILL.md" ".agents/skills/$n/SKILL.md"
done

echo "FUENTE DE VERDAD  (plantillas — rellenar con la skill 'blueprint')"
for k in "$KIT"/nucleo/knowledge/*.md; do poner "$k" "knowledge/wiki/$(basename "$k")"; done

echo "PROTOCOLO Y HERRAMIENTAS"
for p in "$KIT"/nucleo/protocolo/*.md; do poner "$p" "agente/protocolo/$(basename "$p")"; done
for t in "$KIT"/nucleo/tools/*.sh "$KIT"/nucleo/tools/*.mjs; do poner "$t" "agente/tools/$(basename "$t")"; done
chmod +x "$DESTINO"/agente/tools/*.sh "$DESTINO"/agente/tools/*.mjs 2>/dev/null

echo "CI  (plantillas — copiar a .github/workflows/ es un paso consciente)"
poner "$KIT/nucleo/ci/README.md" "agente/ci/README.md"
for c in "$KIT"/nucleo/ci/github/*.yml; do poner "$c" "agente/ci/github/$(basename "$c")"; done

$HOOKS && { echo "HOOKS"; poner "$KIT/nucleo/hooks/settings.json" ".claude/settings.json"; }
$MCP   && { echo "MCP";   poner "$KIT/nucleo/mcp/.mcp.json"       ".mcp.json"; }

if [ ${#PACKS[@]} -gt 0 ]; then
  echo "PACKS: ${PACKS[*]}"
  for p in "${PACKS[@]}"; do
    poner "$KIT/packs/$p/PACK.md" "agente/packs/$p/PACK.md"
    [ -f "$KIT/packs/$p/rule.mdc" ] && poner "$KIT/packs/$p/rule.mdc" ".cursor/rules/$p.mdc"
    # Herramientas propias del pack, sueltas en su raíz: TODAS, sin lista de extensiones.
    #
    # Había una —mjs, sh, py, ts, sql, css— y dejaba fuera `canario.yml` del pack de tasas,
    # que su propio PACK.md manda usar: «canario.yml es la plantilla, con la explicación
    # dentro». Quien lo instalaba iba a buscarlo y no estaba, sin un solo aviso.
    #
    # Es el mismo fallo que el comentario de abajo cuenta de `soporte/`, un nivel más
    # arriba y con extensiones en vez de carpetas. Una lista explícita deja fuera en
    # silencio lo que se añada después, y el día que se añade nadie se acuerda de la lista.
    for x in "$KIT/packs/$p"/*; do
      [ -f "$x" ] || continue
      case "$(basename "$x")" in PACK.md|rule.mdc|mcp.json) continue ;; esac   # colocados aparte
      poner "$x" "agente/packs/$p/$(basename "$x")"
    done
    chmod +x "$DESTINO/agente/packs/$p"/*.mjs "$DESTINO/agente/packs/$p"/*.sh 2>/dev/null
    [ -d "$KIT/packs/$p/activos" ] && for a in "$KIT/packs/$p/activos"/*; do poner "$a" "knowledge/wiki/$(basename "$a")"; done
    [ -d "$KIT/packs/$p/hojas"   ] && for h in "$KIT/packs/$p/hojas"/*;   do poner "$h" "agente/sistema/$(basename "$h")"; done
    [ -d "$KIT/packs/$p/detectores" ] && { for x in "$KIT/packs/$p/detectores"/*; do poner "$x" "agente/packs/$p/detectores/$(basename "$x")"; done; chmod +x "$DESTINO/agente/packs/$p/detectores"/*.sh 2>/dev/null; }
    # plantillas listas para copiar: e2e/, aislamiento/, despliegue/
    # Todas las subcarpetas del pack, descubiertas: una lista explícita deja fuera en
    # silencio cualquier carpeta nueva — pasó con soporte/.
    for subdir in "$KIT/packs/$p"/*/; do
      [ -d "$subdir" ] || continue
      sub=$(basename "$subdir")
      [ "$sub" = "activos" ] || [ "$sub" = "hojas" ] && continue
      [ -d "$KIT/packs/$p/$sub" ] || continue
      for x in "$KIT/packs/$p/$sub"/*; do
        if [ -d "$x" ]; then for y in "$x"/*; do poner "$y" "agente/packs/$p/$sub/$(basename "$x")/$(basename "$y")"; done
        else poner "$x" "agente/packs/$p/$sub/$(basename "$x")"; fi
      done
    done
    for pr in $(prompts_de_pack "$p"); do poner "$KIT/prompts/$pr" "agente/prompts/$pr"; done
  done
  # Packs con servidor MCP propio (`mcp.json` en su raíz): se FUSIONAN en el .mcp.json del
  # proyecto en vez de copiarse. No van en el del núcleo porque un MCP declarado y no usado
  # gasta contexto en cada arranque; sólo quien elige el pack lo carga. Un servidor que ya
  # exista con el mismo nombre no se toca salvo con --force: puede llevar ajustes locales.
  if $MCP; then
    for p in "${PACKS[@]}"; do
      [ -f "$KIT/packs/$p/mcp.json" ] || continue
      node - "$KIT/packs/$p/mcp.json" "$DESTINO/.mcp.json" "$FORCE" <<'NODE'
const fs = require('fs');
const [origen, destino, force] = process.argv.slice(2);
const pack = JSON.parse(fs.readFileSync(origen, 'utf8'));
const proyecto = fs.existsSync(destino) ? JSON.parse(fs.readFileSync(destino, 'utf8')) : { mcpServers: {} };
proyecto.mcpServers ??= {};
for (const [nombre, servidor] of Object.entries(pack.mcpServers ?? {})) {
  if (proyecto.mcpServers[nombre] && force !== 'true') { console.log(`  = .mcp.json ya declara «${nombre}»: no se toca`); continue; }
  proyecto.mcpServers[nombre] = servidor;
  console.log(`  + .mcp.json ← servidor MCP «${nombre}»`);
}
fs.writeFileSync(destino, JSON.stringify(proyecto, null, 2) + '\n');
NODE
    done
  fi
else
  echo "PACKS: ninguno.  Elige los que apliquen con:  $0 --packs"
fi

# .gitignore mínimo del kit
if ! grep -q '^\.ratchets/' "$DESTINO/.gitignore" 2>/dev/null; then
  printf '\n# kit ia-template\n.ratchets/*.lista\n' >> "$DESTINO/.gitignore"; echo "  ~ .gitignore (añadido .ratchets/*.lista)"
fi

echo; echo "──────────────────────────────────────────────"
echo "$NUEVOS ficheros nuevos."
if [ ${#SALTADOS[@]} -gt 0 ]; then
  echo "${#SALTADOS[@]} ya existían y NO se tocaron:"; printf '    %s\n' "${SALTADOS[@]}"
  echo "  (compara a mano, o reinstala con --force si quieres la versión del kit)"
fi
cat <<'FIN'

Siguiente paso:
  1. Abre una sesión de agente en el proyecto e invoca la skill  blueprint
     — rellena AGENTS.md y knowledge/wiki/ leyendo el código, y solo pregunta lo que no
       puede deducir.
  2. Elige los packs que apliquen y vuelve a correr el instalador con ellos.
  3. Asegúrate de que existe UN comando que corre la puerta de calidad entera
     (AGENTS.md §4). Si no existe, esa es la primera tarea del proyecto:
       agente/tools/puerta.sh          descubre lo que hay
       agente/ci/README.md             las plantillas de workflow y qué ajustar
  4. Cuando el proyecto lleve un tiempo, mira qué merece volver al kit:
       node agente/tools/cosechar.mjs
  5. Fija las líneas base de los verificadores, para que la deuda deje de crecer:
       node agente/tools/tamano.mjs    baseline src
       node agente/tools/ciclos.mjs    src
       node agente/tools/secretos.mjs
       node agente/tools/esquema.mjs   sellar          # si hay migraciones
       node agente/tools/cobertura.mjs proponer        # tras correr los tests con cobertura
FIN
