#!/usr/bin/env bash
# contrasenas.sh — trinquete: ningún algoritmo de contraseñas que no sea argon2id.
#   contrasenas.sh instalar   fija la línea base con lo que hay hoy
#   contrasenas.sh validar    falla si aparece un uso nuevo (código 1)
#   contrasenas.sh listar     enseña el comando sin ejecutarlo
#
# Cuenta llamadas, no menciones: bcrypt, scrypt y PBKDF2 en un comentario no suman. Lo que
# queda tras instalar es el verificador `Legado` de cada proyecto; la cifra baja a cero el
# día que se borra, y a partir de ahí nadie puede volver a introducirlo sin que falle.
# Ver agente/packs/seguridad/PACK.md § Contraseñas.
set -o pipefail
SRC="${SRC:-.}"
export PATRON
RATCHET="${RATCHET:-agente/tools/ratchet.sh}"
[ -x "$RATCHET" ] || RATCHET="$(dirname "${BASH_SOURCE[0]}")/../../../nucleo/tools/ratchet.sh"

NOMBRE=hash-legado
# Lo versionado más lo nuevo que no está ignorado: una lista de carpetas excluidas siempre se
# queda corta, porque cada proyecto nombra su salida de compilación a su manera (.next,
# .next-verify, dist…). Y contar sólo lo versionado dejaría fuera el fichero recién creado,
# que es justo el que sube el recuento el día que se commitea.
PATRON="from ['\"]bcrypt|require\\(['\"]bcrypt|^import bcrypt|bcrypt\\.(hash|compare|gensalt|hashpw|checkpw)|scrypt(Sync)?\\(|hashlib\\.scrypt|pbkdf2(Sync)?\\(|pbkdf2_hmac|name: *['\"]PBKDF2|argon2\\.argon2i\\b"
COMANDO="git ls-files -z --cached --others --exclude-standard -- '$SRC' ':!:agente/**' | grep -zE '\\.(ts|tsx|js|jsx|mjs|cjs|py)\$' | xargs -0 grep -nE \"\$PATRON\" --"

case "${1:-}" in
  listar)   printf '── %s\n   %s\n' "$NOMBRE" "$COMANDO" ;;
  instalar) bash "$RATCHET" baseline "$NOMBRE" "$COMANDO" | head -1
            echo 'Añade a la puerta:  bash agente/packs/seguridad/detectores/contrasenas.sh validar' ;;
  validar)  bash "$RATCHET" validate "$NOMBRE" "$COMANDO" ;;
  *) sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
