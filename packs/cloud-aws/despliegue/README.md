# Despliegue sin credenciales de larga vida

> El patrón de `deploy-oidc-ssm.yml`, y lo que hay que crear en AWS para que funcione.

---

## Por qué OIDC

Una clave de acceso guardada en los secretos del repositorio es una credencial permanente:
hay que rotarla, sobrevive a quien la creó, y quien consiga leer los secretos la tiene
entera. Con OIDC, GitHub presenta un testigo firmado, AWS lo valida y devuelve un rol
**temporal** que caduca solo. **No hay nada que rotar y no hay nada que filtrar.**

## Por qué SSM y no SSH

Sin puerto 22 abierto, sin clave privada guardada en ninguna parte, y con cada ejecución
registrada en CloudTrail: quién desplegó, qué comando y cuándo.

## Lo que hay que crear en AWS

**1 · El proveedor de identidad OIDC** (una vez por cuenta)

```
URL:       https://token.actions.githubusercontent.com
Audiencia: sts.amazonaws.com
```

**2 · El rol de despliegue, con la confianza acotada**

El campo que importa es `sub`. Sin él —o con un comodín demasiado ancho— **cualquier
repositorio de GitHub podría asumir tu rol**.

```jsonc
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<CUENTA>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        // Acota a UN repositorio y UNA rama o entorno. Nunca "repo:*".
        "token.actions.githubusercontent.com:sub": "repo:<usuario>/<repo>:ref:refs/heads/main"
      }
    }
  }]
}
```

> Para desplegar desde un entorno protegido de GitHub, la condición es
> `repo:<usuario>/<repo>:environment:production`, que además permite exigir aprobación
> manual antes de que el job arranque.

**3 · Los permisos del rol, mínimos**

Solo mandar el comando a **esa** instancia y leer el resultado:

```jsonc
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "ssm:SendCommand",
      "Resource": ["arn:aws:ssm:<region>::document/AWS-RunShellScript",
                   "arn:aws:ec2:<region>:<cuenta>:instance/i-XXXXXXXX"] },
    { "Effect": "Allow", "Action": ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
      "Resource": "*" }
  ]
}
```

**4 · La instancia, como nodo gestionado**

Con el agente SSM corriendo y un perfil de instancia que incluya
`AmazonSSMManagedInstanceCore`. Se comprueba con
`aws ssm describe-instance-information`: si la instancia no aparece ahí, `send-command`
se queda esperando sin decir por qué.

**5 · El script remoto**, en la máquina, no en el workflow

`/usr/local/bin/desplegar.sh <sha>`: trae ese commit exacto, construye, migra, reinicia el
servicio. Que viva en la máquina permite revisarlo y probarlo sin pasar por la CI.

---

## Las cuatro decisiones del workflow

| Decisión | Qué evita |
|---|---|
| Se despliega el **SHA que pasó la puerta**, no la rama | entre que la puerta pasó y el despliegue arranca puede haber entrado otro commit |
| El disparo manual **re-comprueba** la puerta de ese SHA | el disparo manual es el agujero clásico para saltarse la puerta |
| Las acciones **fijadas por SHA**, no por etiqueta | una etiqueta se mueve, y quien la mueva ejecuta código en un job que puede asumir tu rol |
| `cancel-in-progress: false` | cancelar un despliegue a medias deja la máquina en un estado intermedio |

Y al final, comprobar el **borde público**: que el script terminara bien no significa que
el sitio funcione. Se comprueba desde fuera, atravesando DNS, proxy y certificado, que es
donde se rompe.

---

## Lo que este patrón NO hace

**No es blue/green ni canary.** Reinicia el servicio en la misma máquina: hay un hueco de
segundos. Para no tenerlo hacen falta dos destinos y un balanceador delante — otro patrón,
más caro, y solo merece la pena cuando el hueco importa de verdad.

**No revierte solo.** Si el borde público falla, el job queda en rojo y la máquina se queda
con la versión nueva. Volver atrás es desplegar el SHA anterior — que funciona porque se
despliega por SHA, no por rama. Escríbelo en el manual de operación antes de necesitarlo.
