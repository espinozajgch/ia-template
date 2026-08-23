# Pack · cloud-aws

**Se activa si:** la infraestructura vive en AWS.

**Prompts:** `AWS_AGENT_TOOLKIT_PROMPT.md` · `DEVSECOPS_PROMPT.md` ·
`CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` · `INFRA_ACCESS_PROMPT.md`

---

## Reglas

### La identidad del agente es de solo lectura, y no se rodea

La identidad configurada para inspección es deliberadamente de solo lectura. **No se
sortea** cambiando de perfil local ni cayendo a una CLI con permisos de escritura. Si una
tarea necesita escribir, la tarea es preparar el cambio, no ejecutarlo.

### Toda mutación pasa por una persona

El agente prepara: el diff de infraestructura como código, los comandos exactos, el impacto,
la vuelta atrás y el coste. Y **para**. La ejecución la hace una persona fuera de la sesión.

### Nunca, en ninguna circunstancia

Borrar recursos · cambiar VPC, subredes, rutas, grupos de seguridad o DNS · rotar
credenciales · **leer el valor de un secreto** (`GetSecretValue` y equivalentes están
prohibidos) · cualquier acción irreversible.

### El despliegue, sin credenciales de larga vida

El pack prohibía las mutaciones sin enseñar el patrón bueno. Está en
[`despliegue/`](despliegue/README.md): GitHub se autentica por **OIDC** y recibe un rol
temporal —no hay clave que rotar ni que filtrar—, se despliega por **SSM Run Command** —sin
puerto 22 abierto, sin clave privada, con todo auditado en CloudTrail—, y se despliega
**el commit exacto que pasó la puerta**, no la rama.

Con el detalle que cierra el agujero clásico: el disparo manual **re-comprueba** que ese
commit tiene la puerta en verde. Si no, no despliega.

### Infraestructura como código, no consola

Se prefiere CDK o CloudFormation a la mutación directa. Un cambio hecho a mano en la
consola es deriva: no está en ningún sitio y desaparece en el siguiente despliegue.

### Verificar contra la documentación oficial

Los detalles de AWS cambian. Antes de afirmar un límite, una cuota o el nombre de un
parámetro, se comprueba. Adivinar en infraestructura sale caro en una moneda distinta.

### El coste es un requisito

Todo recurso nuevo se propone con su coste mensual estimado y qué lo dispara. Una tabla sin
límite de capacidad y un log sin caducidad son las dos formas más habituales de que una
factura crezca sin que nadie lo note.

### Skills instaladas primero

Antes de una tarea de AWS, descubrir y cargar la skill de AWS instalada que corresponda.
Está escrita por quien mantiene el servicio.

---

## Checklist

- [ ] La identidad usada es la de solo lectura
- [ ] Ninguna mutación ejecutada por el agente: diff + comandos + impacto + vuelta atrás + coste
- [ ] Ningún valor de secreto leído, impreso ni guardado
- [ ] El cambio está expresado como infraestructura como código
- [ ] Coste mensual estimado y qué lo dispara
- [ ] Detalles verificados contra la documentación oficial
