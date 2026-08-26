<!-- ejemplo-rellenado -->
> ## 🛑 ESTE PROMPT CONTIENE ÓRDENES REALES CONTRA UNA INFRAESTRUCTURA CONCRETA
>
> No es una plantilla: son las rutas, el servidor y el repositorio de
> `ppsportmanagementarg`, con órdenes ejecutables tal cual — entre ellas un
> `git remote set-url origin …` y un `cd` a un directorio de su máquina.
>
> **Ejecutarlo sin reescribirlo puede apuntar TU repositorio al de otro**, o hacer trabajo
> contra un servidor que no es el tuyo. No es «contexto desactualizado»: es una orden que
> funciona, dirigida al sitio equivocado.
>
> **Antes de usarlo:** sustituye cada ruta, cada nombre de host y cada URL de repositorio, y
> repasa una por una las órdenes con `git remote`, `ssh`, `scp` y `rm`. Lo que se conserva es
> el procedimiento —qué hay que comprobar para dar por bueno un acceso—, nunca los valores.

---

# INFRA_ACCESS_PROMPT — Acceso a AWS (SSM) y GitHub para agentes

> **Qué es esto:** el manual de puesta en marcha y operación de la infraestructura de
> PPTransferHub, escrito para que **un agente (o una persona) que llega sin contexto** pueda
> instalar el tooling, configurar credenciales, conectarse a AWS y a GitHub, levantar el
> entorno de desarrollo y ejecutar/verificar un despliegue — sin abrir puertos, sin crear
> access keys permanentes y sin ver el valor de ningún secreto.
>
> **Fuentes de verdad que este documento ORQUESTA (no reemplaza):**
> - `knowledge/wiki/production-secrets-rds-ssm-runbook.md` — secretos, RDS, TLS, túnel SSM (detalle exhaustivo).
> - `knowledge/manual-acceso-aws-ssm.html` — manual visual de acceso por SSM (túneles A/B, troubleshooting).
> - `knowledge/wiki/despliegue-produccion-oidc-ssm.md` — cadena GitHub OIDC → STS → SSM Run Command.
> - `knowledge/wiki/rds-tls.md` — política TLS de la conexión a la base.
> - `knowledge/wiki/infra-nginx-manual.md` — Nginx/systemd de producción (no lo gestiona el deploy).
> - `knowledge/wiki/aws-agent-toolkit.md` — MCP de AWS en modo sólo-lectura para agentes.
> - `knowledge/wiki/e2e-backend-sweep-runbook.md` — barrido E2E de backend sobre la BD de dev.
>
> Si algún dato de este documento contradice a los de arriba, **manda la fuente de verdad**
> y este documento debe corregirse.

---

## 0. Regla cero — lo que un agente NO puede hacer

| Prohibido | Por qué / qué hacer |
|---|---|
| `git push` sin autorización explícita del usuario | Regla del proyecto (`CLAUDE.md`). Commits locales sí; push sólo si lo piden con palabras ("subí", "push"). |
| Imprimir el **valor** de un secreto (`DATABASE_URL`, `JWT_SECRET`, PAT, VAPID, `LLM_API_KEY`) | Se verifica por **nombre**: `sudo cut -d= -f1 /run/pptransfer/secrets.env`. Nunca `cat`. |
| Crear access keys IAM permanentes (`AKIA…`) | Todo el acceso es temporal: SSO/`aws login` en local, IAM Role en EC2, OIDC en Actions. |
| Abrir el puerto 22 o 5432 a Internet | El acceso es 100 % por SSM. Ningún flujo necesita ingress. |
| Ejecutar `aws login` / SSO interactivo | Requiere navegador: **lo hace el humano**. El agente detecta la sesión vencida y lo pide. |
| Apuntar `scripts/dev-tunnel.sh` a RDS | Es dev-only (Túnel B). RDS es Túnel A, explícito y aparte. |
| Escribir infraestructura desde el MCP de AWS | El perfil `agent-readonly` es sólo-lectura por IAM. Los cambios los ejecuta una persona. |

---

## 1. Mapa mental de la infraestructura

```text
┌── LOCAL (Mac del desarrollador / agente) ─────────────────────────────────────┐
│  AWS CLI v2 + session-manager-plugin + perfil SSO `pptransfer-dev`            │
│  gh CLI (cuenta con acceso al repo)                                          │
│      │                                                                        │
│      ├─ aws ssm start-session ──────► shell en la EC2 (sin SSH, sin :22)      │
│      ├─ Túnel A (RDS prod  → :15432, TLS verify-full)                         │
│      ├─ Túnel B (PG de dev en la EC2 → :5434)  ← scripts/dev-tunnel.sh        │
│      └─ aws ssm send-command ──────► deploy manual (fallback del CI)          │
└───────────────────────────────────────────────────────────────────────────────┘

┌── GITHUB ─────────────────────────────────────────────────────────────────────┐
│  push a main → Tests and Coverage → E2E Smoke → deploy-main.yml               │
│                                        │                                      │
│                                        └─ OIDC → STS → PPTransferHubGitHubDeployRole
│                                              └─ ssm:SendCommand (1 doc, 1 instancia)
└───────────────────────────────────────────────────────────────────────────────┘

┌── AWS eu-north-1 · cuenta 973294444912 ───────────────────────────────────────┐
│  EC2 i-0c57b591813c1eb89                                                      │
│    ├ Nginx :80/:443 → estáticos + proxy /api, /uploads, /api/media            │
│    ├ systemd pptransferhub-api.service (Node 22)                              │
│    │    └ ExecStartPre → pptransfer-fetch-secrets.sh → /run/pptransfer/secrets.env
│    ├ PostgreSQL local  = base de DESARROLLO/PRUEBA                            │
│    └ /usr/local/bin/pptransferhub-deploy.sh  (el deploy real)                 │
│  RDS pptransferhub-db (privado, TLS, PITR)  = base de PRODUCCIÓN              │
│  SSM Parameter Store /pptransfer/prod/*  (SecureString + KMS alias/pptransfer-prod)
│  S3 bucket de media (uploads + informes PDF)                                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Dato crítico y contraintuitivo:** en la EC2 conviven **dos bases**. El PostgreSQL *dentro*
de la EC2 es **desarrollo**; producción es **RDS**. `.env` de la raíz apunta a la de dev por
el túnel B (`127.0.0.1:5434`). Nunca se corren scripts de prueba contra RDS salvo autorización
explícita del usuario.

---

## 2. Instalación (máquina nueva, macOS)

```bash
# 2.1 Herramientas base
brew install awscli gh jq postgresql@18   # psql cliente; el server no hace falta en local
node --version                            # Node 22 LTS (nvm/asdf/volta a gusto)

# 2.2 Session Manager Plugin (NO viene con el CLI)
#   Apple Silicon — instalador oficial de AWS:
curl -fsSL "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac_arm64/sessionmanager-bundle.zip" -o /tmp/smp.zip
unzip -o /tmp/smp.zip -d /tmp/smp && sudo /tmp/smp/sessionmanager-bundle/install \
  -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin

# 2.3 Verificación
aws --version                 # esperado: aws-cli/2.36.x o superior
session-manager-plugin --version
gh --version
```

CA pública de RDS (necesaria para `verify-full` desde el Mac):

```bash
mkdir -p "$HOME/.postgresql"
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  -o "$HOME/.postgresql/root.crt"
chmod 600 "$HOME/.postgresql/root.crt"
grep -c 'BEGIN CERTIFICATE' "$HOME/.postgresql/root.crt"   # > 100
```

---

## 3. Configuración de AWS

### 3.1 Perfiles

`~/.aws/config` (sin secretos: la identidad se resuelve por sesión temporal):

```ini
[profile pptransfer-dev]
login_session = arn:aws:iam::973294444912:user/developer
region = eu-north-1

[profile agent-readonly]          # opcional: MCP de AWS en modo sólo-lectura
role_arn = arn:aws:iam::973294444912:role/AgentToolkitReadOnlyRole
source_profile = default
region = eu-north-1
```

### 3.2 Autenticación (paso humano)

```bash
aws login --profile pptransfer-dev        # o: aws sso login --profile pptransfer-dev
aws sts get-caller-identity --profile pptransfer-dev
```

Debe devolver la cuenta `973294444912`. Las credenciales son **temporales**; cuando expiran,
todo comando falla con `Unable to locate credentials` / `ExpiredToken` → el agente **pide al
usuario que repita el login**, no intenta workarounds.

### 3.3 Comprobar que la EC2 está administrada por SSM

```bash
aws ssm describe-instance-information \
  --filters 'Key=InstanceIds,Values=i-0c57b591813c1eb89' \
  --region eu-north-1 --profile pptransfer-dev \
  --query 'InstanceInformationList[0].{Id:InstanceId,Ping:PingStatus,Agent:AgentVersion}' \
  --output table
```

`Ping` debe ser `Online`. Si no, el agente SSM de la instancia está caído → nada de lo que
sigue funciona (ni deploy ni túneles).

---

## 4. Conexión a AWS por SSM

### 4.1 Shell interactiva en la EC2

```bash
aws ssm start-session --target i-0c57b591813c1eb89 \
  --region eu-north-1 --profile pptransfer-dev
```

Entra como `ssm-user`. Para operar la app:

```bash
sudo -i -u ubuntu
cd /home/ubuntu/ppsportmanagementarg
```

### 4.2 Túnel B — base de DESARROLLO (uso diario)

Un solo comando levanta túnel + backend + frontend:

```bash
scripts/dev-tunnel.sh              # túnel + server + client (hot reload)
scripts/dev-tunnel.sh --tunnel     # sólo el túnel (psql / DBeaver / tests)
scripts/dev-tunnel.sh --preview    # build de producción + vite preview (probar la PWA/SW)
```

Reenvía `EC2:5432 → 127.0.0.1:5434`, que es exactamente el puerto del `DATABASE_URL` del
`.env` de la raíz (`DATABASE_SSL=false`, loopback). Hace preflight de sesión AWS, espera el
puerto y `/api/health`, y cierra todo al salir.

### 4.3 Túnel A — RDS de PRODUCCIÓN (excepcional, con autorización)

```bash
aws ssm start-session --target i-0c57b591813c1eb89 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["pptransferhub-db.czm0iume4xbi.eu-north-1.rds.amazonaws.com"],
                 "portNumber":["5432"],"localPortNumber":["15432"]}' \
  --region eu-north-1 --profile pptransfer-dev
```

Conexión con verificación completa del certificado (`host` real para validar el nombre,
`hostaddr` para dirigir al túnel):

```bash
psql "host=pptransferhub-db.czm0iume4xbi.eu-north-1.rds.amazonaws.com \
      hostaddr=127.0.0.1 port=15432 dbname=pptransferhub user=pptransfer_user \
      sslmode=verify-full sslrootcert=$HOME/.postgresql/root.crt"
```

La contraseña de RDS **no está en el repo ni en este documento**: vive en
`/pptransfer/prod/DATABASE_URL` (SecureString). Pedírsela al usuario o extraerla con una
identidad autorizada — nunca pegarla en un archivo, un log o un informe.

`ssl=true` + `TLSv1.3` en `pg_stat_ssl` es el criterio de aceptación (ver §10.7 del runbook).

### 4.4 Secretos (Parameter Store)

- Prefijo `/pptransfer/prod/`, tipo `SecureString`, KMS `alias/pptransfer-prod`.
- **Requeridos** (sin ellos la API no arranca, fail-secure): `DATABASE_URL`, `JWT_SECRET`.
- **Opcionales** (degradan limpio): `LLM_API_KEY`, `LLM_EMBED_API_KEY`, `GITHUB_OPS_TOKEN`,
  `VAPID_*`, `EMAIL_*`.
- **Añadir uno nuevo no requiere tocar código de infra**: `pptransfer-fetch-secrets.sh`
  descubre todos los `SecureString` bajo el prefijo (`GetParametersByPath`) y los escribe en
  `/run/pptransfer/secrets.env` (0600 root:root). El nombre de la variable es el último
  segmento del path. Después: `sudo systemctl restart pptransferhub-api.service`.
- Verificación **sin exponer valores**:

```bash
sudo systemctl cat pptransferhub-api.service
sudo stat -c '%a %U:%G %n' /run/pptransfer/secrets.env    # 600 root:root
sudo cut -d= -f1 /run/pptransfer/secrets.env              # SOLO nombres
```

### 4.5 MCP de AWS en modo sólo-lectura (opcional, para agentes)

Perfil `agent-readonly` → `AgentToolkitReadOnlyRole` (`ReadOnlyAccess` + deny explícito de
valores de Secrets Manager / Parameter Store / `kms:Decrypt`). Detalle e instalación:
`knowledge/wiki/aws-agent-toolkit.md`. El agente **nunca** usa la identidad administrativa
para inspeccionar.

---

## 5. Configuración de GitHub

### 5.1 Repositorio

- `chavi-pp/ppsportmanagementarg`, rama principal `main` (privado).
- Workflows: `tests.yml`, `e2e.yml`, `deploy-main.yml`, `migrate-qa.yml`, `mutation.yml`, `secrets-scan.yml`.

### 5.2 Autenticación local

```bash
gh auth status                 # cuentas y scopes
gh auth switch --user <cuenta> # si hay varias, activar la que tiene acceso al repo
git config --get credential.helper       # osxkeychain
git config --local --get remote.origin.url
```

**Invariante de seguridad (AD-27):** la URL de `origin` **no debe contener el token**. Forma
correcta:

```bash
git remote set-url origin https://github.com/chavi-pp/ppsportmanagementarg.git
# El PAT vive en el Keychain (usuario x-access-token) o se usa `gh auth setup-git`.
```

Si `git remote -v` muestra `https://ghp_…@github.com/…`, es una **regresión de AD-27**:
avisar al usuario, quitar el token de la URL y **rotar** el PAT en GitHub (redactar no basta:
la credencial sigue siendo válida).

Trampa ya vista (2026-07-28): un `git push` que devuelve **404** en un repo privado casi
siempre es **cuenta equivocada** (PAT viejo cacheado en el Keychain), no un repo inexistente.
Diagnóstico: `gh auth status` + `git ls-remote`.

### 5.3 Credenciales que GitHub **no** guarda

No hay access keys de AWS en GitHub. `deploy-main.yml` obtiene credenciales temporales por
**OIDC**:

- Provider `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
- Rol `PPTransferHubGitHubDeployRole`, con trust restringido a
  `repo:chavi-pp/ppsportmanagementarg:environment:production`.
- Permisos: `ssm:SendCommand` acotado a **un** documento (`AWS-RunShellScript`) y **una**
  instancia. Políticas versionadas en `ops/iam/*.json`.

`DATABASE_URL` y `JWT_SECRET` **no existen** como secrets de GitHub. Sí viven ahí variables
no sensibles (`CLIENT_URL`, `NODE_ENV`, `PORT`, `DATABASE_SSL`, `NGINX_WEB_ROOT`, …).

### 5.4 `GITHUB_OPS_TOKEN` (widget "Desarrollo → Deploys")

PAT fine-grained de **sólo lectura de Actions**, consumido por `server/src/lib/githubDeploys.ts`
para mostrar los runs del CI dentro de la app. Vive en `/pptransfer/prod/GITHUB_OPS_TOKEN`
(prod) o en el `.env` local. Si el widget devuelve **502**, el token venció o fue rotado:
actualizar el parámetro y **reiniciar el servicio** (el `ExecStartPre` lo vuelve a bajar).

---

## 6. Entorno local de desarrollo

```bash
git clone https://github.com/chavi-pp/ppsportmanagementarg.git
cd ppsportmanagementarg
(cd client && npm ci) && (cd server && npm ci)
cp .env.example .env          # rellenar; DATABASE_URL apunta a 127.0.0.1:5434 (túnel B)
scripts/dev-tunnel.sh         # túnel + API :3001 + front :5173
```

Gates obligatorios antes de cualquier commit que vaya a subirse:

```bash
cd client && npm run quality:check     # ratchets + build + coverage
cd server && npm run quality:check     # build + loc + coverage + db:check
cd client && npx playwright install chromium && npm run e2e   # 22/22, mockea /api
```

Migraciones: se aplican **primero a la base de dev (EC2)** con `npm run db:migrate` y recién
después se commitea (regla anti-drift de `CLAUDE.md`). RDS la migra exclusivamente el deploy.

---

## 7. Despliegue

### 7.1 Camino normal (CI)

`push a main` → **Tests and Coverage** → **E2E Smoke** → `deploy-main.yml`:

1. asume el rol por OIDC y verifica el ARN resultante;
2. envía el **SHA exacto** que pasó los gates por `ssm send-command` (determinismo OPS-01);
3. espera estado terminal, publica stdout/stderr y falla si no es `Success`;
4. verifica el edge público desde el runner.

Serialización doble: `concurrency` en GitHub + `flock` en la EC2.

### 7.2 Camino manual (fallback — CI sin minutos, incidente)

El script del servidor es el mismo; sólo cambia quién lo invoca.

```bash
SHA=<40 hex del commit ya pusheado a origin/main>
cat > /tmp/ssm.json <<EOF
{"commands":["sudo -u ubuntu /usr/local/bin/pptransferhub-deploy.sh $SHA"]}
EOF

CMD=$(aws ssm send-command --profile pptransfer-dev --region eu-north-1 \
  --instance-ids i-0c57b591813c1eb89 --document-name AWS-RunShellScript \
  --timeout-seconds 1800 --parameters file:///tmp/ssm.json \
  --query 'Command.CommandId' --output text)

aws ssm get-command-invocation --profile pptransfer-dev --region eu-north-1 \
  --command-id "$CMD" --instance-id i-0c57b591813c1eb89 \
  --query '{Status:Status,Out:StandardOutputContent,Err:StandardErrorContent}' --output json
```

Notas duras aprendidas en producción:

- `--parameters` **inline** se rompe con comillas anidadas → usar siempre `file://`.
- El deploy tarda ~90–120 s: hacer *poll* de `Status` hasta `Success`/`Failed`.
- El script exige SHA de 40 hex, valida que sea ancestro de `main`, que el remote sea el
  esperado y que el working tree esté limpio.
- Requiere que el commit **esté en `origin`** (la EC2 hace `git fetch`). Si el push aún no se
  hizo, no hay deploy.

### 7.3 Verificación posterior (obligatoria)

```bash
curl -fsS https://pptransferhub.com/api/health     # ok:true + commit == SHA desplegado
```

En la instancia: `systemctl is-active pptransferhub-api.service`, `nginx -t`,
`git -C /home/ubuntu/ppsportmanagementarg rev-parse HEAD`.

> **No verificar el edge público con `curl` desde la propia EC2**: da falsos negativos
> (`curl (52) Empty reply`). La comprobación externa se hace desde fuera de la instancia.

### 7.4 Rollback

Migraciones **forward-only**. Antes de migrar, el script restaura los artefactos que ya
hubiera intercambiado. Después de migrar, **no** se revierte a ciegas: se evalúa la
compatibilidad backward del schema y, si no la hay, se despliega un *fix-forward*.
PITR/snapshot sólo ante corrupción y dentro de un incidente aprobado.

---

## 8. Troubleshooting

| Síntoma | Causa habitual | Acción |
|---|---|---|
| `Unable to locate credentials` / `ExpiredToken` | Sesión SSO vencida | El **usuario** repite `aws login --profile pptransfer-dev` |
| `TargetNotConnected` | Agente SSM caído / instancia parada | `describe-instance-information`; reiniciar el agente desde la consola |
| El túnel abre pero `psql` da `Connection refused` | Puerto local ocupado o servicio remoto caído | `lsof -nP -iTCP:<puerto> -sTCP:LISTEN`; revisar el log del túnel |
| `no pg_hba.conf entry … no encryption` | Falta TLS (RDS lo exige) | `sslmode=verify-full` + `sslrootcert` |
| `AccessDeniedException` en `ssm:SendCommand` | Perfil sin permiso o instancia distinta | Confirmar identidad y que el target sea la instancia autorizada |
| `git push` → **404** en repo privado | Cuenta/PAT equivocados en el Keychain | `gh auth status`, `gh auth switch`, re-autenticar |
| Widget de Deploys → **502** | `GITHUB_OPS_TOKEN` vencido/rotado | Actualizar el parámetro SSM + `systemctl restart` |
| Deploy `Success` pero el sitio sirve lo viejo | Caché del Service Worker en el dispositivo | Borrar datos del sitio; el `start_url` de la PWA es `/login` **por diseño** |
| La landing comercial no refleja el último commit | `/var/www/landing` es **copia**, no symlink | El deploy la sincroniza (best-effort) desde `f775d3fd`+; si no, `rsync` manual |

---

## 9. Checklist de puesta en marcha

- [ ] `aws --version` ≥ 2.36 y `session-manager-plugin --version` responden.
- [ ] `aws sts get-caller-identity --profile pptransfer-dev` → cuenta `973294444912`.
- [ ] `describe-instance-information` → `PingStatus: Online`.
- [ ] `scripts/dev-tunnel.sh --tunnel` abre `127.0.0.1:5434` y `psql` conecta.
- [ ] `gh auth status` muestra una cuenta activa con acceso al repo.
- [ ] `git config --local --get remote.origin.url` **sin** token embebido.
- [ ] `client` y `server`: `npm ci` + `npm run quality:check` en verde.
- [ ] `npm run e2e` (cliente) en verde.
- [ ] `curl https://pptransferhub.com/api/health` → `ok:true` con el `commit` esperado.
- [ ] `node ops/check-tracked-secrets.mjs` sin hallazgos.
- [ ] Ningún valor de secreto quedó en un archivo, log, informe o mensaje.

---

## 10. Mantenimiento de este documento

Actualizarlo cuando cambie: el ID de la instancia o el endpoint de RDS, el nombre de un rol
IAM, la lista de parámetros requeridos, la cadena de workflows del deploy, el mecanismo de
autenticación de GitHub, o los puertos/scripts de túnel. Si un procedimiento se detalla en
`knowledge/wiki/`, aquí va **el resumen operativo y el enlace**, nunca una copia divergente.
