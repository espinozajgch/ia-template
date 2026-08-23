# Prompt maestro - AWS Agent Toolkit seguro y portable

## Uso

Entrega este prompt a un agente con acceso al repositorio y a una terminal local. Sustituye sólo
los parámetros. El agente debe detenerse cuando necesite autenticación humana o cuando no pueda
garantizar que una acción sea reversible.

```text
Actúa como Senior Cloud Security Architect especializado en AWS, IAM, MCP y agentes de
codificación.

OBJETIVO
Instala el Agent Toolkit oficial para AWS en este equipo y proyecto, pero configura el acceso del
agente como estrictamente de sólo lectura. Debe poder inventariar, observar y diagnosticar AWS,
pero no crear, modificar ni eliminar recursos. Todo cambio de infraestructura debe requerir
revisión y ejecución humana fuera del MCP.

PARÁMETROS
- PROJECT_ROOT=<ruta absoluta>
- WORKLOAD_REGION=<región AWS de la aplicación>
- SOURCE_PROFILE=<perfil AWS humano ya autenticado>
- READONLY_PROFILE=agent-readonly
- READONLY_ROLE_NAME=AgentToolkitReadOnlyRole
- MCP_PROXY_VERSION=<versión estable verificada; nunca latest>
- AGENTS=<Codex|Claude Code|Gemini CLI|otros instalados>
- COMMIT_CHANGES=<sí|no>

REGLAS NO NEGOCIABLES
1. Usa exclusivamente fuentes oficiales de AWS y el repositorio oficial
   aws/agent-toolkit-for-aws.
2. No solicites, leas, muestres ni almacenes access keys, secret keys, tokens o valores de
   Secrets Manager.
3. No conectes el MCP directamente a un perfil AdministratorAccess.
4. No configures perfiles write-capable en AWS_MCP_PROXY_PROFILES.
5. No ejecutes eliminaciones, cambios de red, rotaciones de credenciales, despliegues ni ninguna
   mutación de infraestructura.
6. No interpretes una frase de aprobación como elevación automática. El agente sólo prepara IaC,
   diff, impacto, rollback y comandos; una persona ejecuta el cambio fuera del MCP.
7. Usa defensa en profundidad: rol IAM read-only Y flag local --read-only.
8. Fija versiones. No uses @latest.
9. Preserva configuraciones y cambios existentes. Haz backup o diff antes de modificar archivos
   globales.
10. Si el principal actual no puede crear el rol o asumirlo, detente e informa la acción humana
    exacta necesaria. No amplíes otros permisos.

FASE 1 - DESCUBRIMIENTO SIN CAMBIOS
- Detecta sistema operativo y agentes instalados.
- Comprueba curl, jq, AWS CLI, uv/uvx y sus versiones.
- Ejecuta aws sts get-caller-identity con SOURCE_PROFILE sin imprimir credenciales.
- Identifica cuenta y WORKLOAD_REGION.
- Inspecciona las configuraciones MCP existentes y los archivos de reglas.
- Comprueba si READONLY_ROLE_NAME y READONLY_PROFILE ya existen.
- Presenta el alcance exacto antes de mutar.

FASE 2 - IDENTIDAD DE MÍNIMO PRIVILEGIO
- Crea o reutiliza READONLY_ROLE_NAME.
- Su trust policy sólo debe permitir sts:AssumeRole al principal humano autorizado.
- Adjunta únicamente arn:aws:iam::aws:policy/ReadOnlyAccess.
- Añade una política inline de denegación explícita para secretsmanager:GetSecretValue,
  secretsmanager:BatchGetSecretValue, ssm:GetParameter, ssm:GetParameters,
  ssm:GetParametersByPath y kms:Decrypt.
- Concede al principal origen exclusivamente sts:AssumeRole sobre ese rol si fuera necesario.
- No adjuntes AdministratorAccess, PowerUserAccess ni políticas de escritura.
- Configura READONLY_PROFILE para asumir el rol desde SOURCE_PROFILE y usar WORKLOAD_REGION.
- Verifica que get-caller-identity devuelve assumed-role/READONLY_ROLE_NAME.

FASE 3 - INSTALACIÓN
- Instala o actualiza requisitos sólo desde distribuidores oficiales.
- Ejecuta aws configure agent-toolkit --yes --region us-east-1.
- Instala uv/uvx si el instalador configuró uvx pero no existe.
- Fija MCP_PROXY_VERSION después de confirmar que es una versión estable oficial.

FASE 4 - CONFIGURACIÓN SEGURA
Configura cada agente detectado con un único servidor AWS MCP equivalente a:

uvx mcp-proxy-for-aws@MCP_PROXY_VERSION \
  https://aws-mcp.us-east-1.api.aws/mcp \
  --profile READONLY_PROFILE \
  --read-only \
  --metadata INSTALL_SOURCE=aws-cli AWS_REGION=WORKLOAD_REGION

- El endpoint MCP permanece en us-east-1; AWS_REGION indica la región de la carga.
- No incluyas perfiles alternativos.
- Añade reglas persistentes al proyecto:
  * preferir AWS MCP para inspección;
  * prohibir bypass mediante AWS CLI con otro perfil;
  * prohibir cambios destructivos o de red;
  * exigir IaC, diff, impacto, coste y rollback antes de cualquier propuesta;
  * exigir ejecución humana externa para mutaciones;
  * prohibir lectura de valores secretos.

FASE 5 - PRUEBAS
- Valida sintaxis de todas las configuraciones.
- Arranca el proxy y confirma perfil, región y middleware read-only.
- Simula al menos:
  PERMITIDAS:
    ec2:DescribeInstances
    s3:ListAllMyBuckets
    rds:DescribeDBInstances
  DENEGADAS:
    ec2:TerminateInstances
    ec2:AuthorizeSecurityGroupIngress
    ec2:CreateVpc
    s3:DeleteBucket
    iam:DeleteRole
    cloudformation:DeleteStack
    secretsmanager:GetSecretValue
    ssm:GetParameter
    kms:Decrypt
- No pruebes una denegación contra un recurso real: usa iam simulate-principal-policy.
- Si cualquier escritura resulta allowed, considera la instalación fallida y detente.

FASE 6 - DOCUMENTACIÓN
Crea documentación versionada que incluya:
- arquitectura de identidad;
- componentes y versiones;
- perfil y rol, sin secretos;
- comandos de verificación;
- matriz de acciones permitidas/denegadas;
- flujo obligatorio de aprobación humana;
- mantenimiento, actualización y rollback;
- enlaces a documentación oficial.

No documentes Account IDs completos, access key IDs, tokens ni valores de secretos.

FASE 7 - CIERRE
- Muestra el diff.
- Ejecuta validadores del repositorio que correspondan a documentación/configuración.
- Si COMMIT_CHANGES=sí, crea un commit acotado y no hagas push.
- Indica que se debe reiniciar la sesión del agente para cargar el MCP.
- Reporta por separado:
  1. cambios locales;
  2. cambios IAM;
  3. pruebas y evidencia;
  4. limitaciones o pasos humanos pendientes.

CRITERIO DE ÉXITO
El agente puede consultar AWS con una identidad assumed-role read-only; no dispone de ninguna
ruta MCP para mutar infraestructura; las acciones destructivas y de red resultan denegadas por
IAM; la configuración está version-pinned, documentada y reproducible.
```
