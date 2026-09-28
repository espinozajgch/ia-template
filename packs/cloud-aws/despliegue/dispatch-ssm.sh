#!/usr/bin/env bash
# dispatch-ssm.sh — despliega un artefacto de S3 en una instancia, por SSM y sin SSH.
#
#   DEPLOY_PROJECT=miapp INSTANCE_ID=i-… BUCKET=… dispatch-ssm.sh <componente> <sha>
#
# ⚠️ EJEMPLO REAL DE OTRO PROYECTO: sale de los cuatro repositorios de Futbot, donde es
# idéntico. Ajusta DEPLOY_PROJECT y la ruta del script de despliegue de la última orden.
#
# Firma dos URL de S3 de 15 minutos (artefacto y su checksum), y manda a la instancia
# las órdenes para descargarlo, verificar el SHA-256, desempaquetarlo y ejecutar
# `.github/scripts/deploy-aws.sh <sha>` desde el propio artefacto.
#
# Las órdenes se construyen en Python con `shlex.quote`, no en una plantilla de `jq`
# con comillas simples: una URL firmada con una comilla dentro dejaba el comando sin
# poder interpretarse en el servidor. Se encontró al unificar las copias el 2026-09-28.
set -euo pipefail
project=${DEPLOY_PROJECT:?DEPLOY_PROJECT requerido: nombre corto del proyecto}

component=${1:?componente requerido}
sha=${2:?sha requerido}
: "${INSTANCE_ID:?AWS_INSTANCE_ID no configurado}"
: "${BUCKET:?AWS_ARTIFACT_BUCKET no configurado}"

payload=$(mktemp)
trap 'unlink "$payload"' EXIT
artifact_url=$(aws s3 presign "s3://${BUCKET}/${component}/${sha}.tar.gz" --expires-in 900)
checksum_url=$(aws s3 presign "s3://${BUCKET}/${component}/${sha}.sha256" --expires-in 900)
ARTIFACT_URL="$artifact_url" CHECKSUM_URL="$checksum_url" COMPONENT="$component" SHA="$sha" PROJECT="$project" \
  python3 - "$payload" <<'PY'
import json
import os
from pathlib import Path
import shlex
import sys

component = os.environ["COMPONENT"]
sha = os.environ["SHA"]
base = f"/var/tmp/{os.environ['PROJECT']}-deploy"
directory = f"{base}/{component}/{sha}"
artifact = f"{directory}/artifact.tar.gz"
checksum = f"{directory}/artifact.sha256"
source = f"{directory}/source"
commands = [
    "set -eu",
    f"install -d -m 0750 {shlex.quote(directory)}",
    f"curl -fsSL --retry 3 --output {shlex.quote(artifact)} {shlex.quote(os.environ['ARTIFACT_URL'])}",
    f"curl -fsSL --retry 3 --output {shlex.quote(checksum)} {shlex.quote(os.environ['CHECKSUM_URL'])}",
    f"cd {shlex.quote(directory)} && sed -i 's#  .*#  artifact.tar.gz#' artifact.sha256 && sha256sum -c artifact.sha256",
    f"install -d -m 0750 {shlex.quote(source)}",
    f"tar -xzf {shlex.quote(artifact)} -C {shlex.quote(source)}",
    f"chmod a+rx {shlex.quote(base)} {shlex.quote(base + '/' + component)} {shlex.quote(directory)} && chmod -R a+rX {shlex.quote(source)}",
    f"bash {shlex.quote(source + '/.github/scripts/deploy-aws.sh')} {shlex.quote(sha)}",
]
Path(sys.argv[1]).write_text(json.dumps({"commands": commands}), encoding="utf-8")
PY

command_id=$(aws ssm send-command --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript --comment "${project} ${component} ${sha}" \
  --parameters "file://${payload}" --query 'Command.CommandId' --output text)
aws ssm wait command-executed --command-id "$command_id" --instance-id "$INSTANCE_ID" || true
aws ssm get-command-invocation --command-id "$command_id" --instance-id "$INSTANCE_ID" \
  --query '{Status:Status,Output:StandardOutputContent,Error:StandardErrorContent}' --output json
test "$(aws ssm get-command-invocation --command-id "$command_id" --instance-id "$INSTANCE_ID" --query Status --output text)" = Success
