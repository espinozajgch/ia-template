# Pack · seguridad

**Se activa si:** el sistema tiene usuarios, maneja datos de terceros o está expuesto a
internet. Es decir: casi siempre.

**Prompts:** `APPSEC_PROMPT.md` · `SECURITY_PROMPT.md` · `FORENSIC_AUDITOR_PROMPT.md`

---

## Reglas

### Los secretos no se leen, no se imprimen, no se copian

El agente **nunca** pide, muestra, guarda ni escribe en un fichero el valor de un secreto.
Se trabaja con **referencias**: el nombre de la variable, el identificador del secreto. Si
la evidencia de un hallazgo exige un secreto, se redacta el identificador y basta.

Un secreto que aparece una vez en un log, en un informe o en el historial de git **está
comprometido** y hay que rotarlo. Por eso no se toca.

### Nada de credenciales en el código

Ni en scripts de base de datos, ni en ficheros de ejemplo, ni «temporalmente». `.env.example`
lleva todas las claves y **ningún valor**.

```bash
node agente/tools/secretos.mjs           # todo lo trackeado + la URL del remoto
node agente/tools/secretos.mjs --diff    # solo lo que va a subir (rápido, para pre-push)
```

El escáner **no imprime el valor encontrado**, solo dónde está y de qué tipo es: imprimirlo
lo copiaría al log de CI, que es exactamente el problema que evita. Y revisa la URL del
remoto, porque el caso real más común no está en el código sino en `.git/config`.

Como paso de CI: `agente/ci/github/secretos.yml`.

### Los datos personales se inventarían

Qué campo guarda qué dato personal, en qué tabla, con qué base legal y cuánto tiempo. Sin
inventario no hay borrado, ni exportación, ni respuesta a una petición del titular. Vive en
`knowledge/wiki/inventario-datos-personales.md`.

### Autorización: fail-closed y en el borde

Ver el pack `api-backend`. El hallazgo recurrente es el guard de lectura montado en un
router que también escribe.

### La validación del cliente no es validación

Es comodidad. Todo se revalida en el servidor.

### Los identificadores no se adivinan

Un identificador secuencial en una URL invita a probar el siguiente. Si el recurso es
sensible: identificador no adivinable **y** comprobación de propiedad. El identificador
opaco sin comprobación de propiedad no protege nada, solo lo disimula.

### Las dependencias se auditan en la puerta

Un aviso de vulnerabilidad que solo sale en CI y nadie lee es lo mismo que no tenerlo.

---

## Segundo factor

`segundo-factor.ts` — TOTP (RFC 6238) **sin dependencias**, con códigos de respaldo.
**19 tests, cinco de ellos los vectores oficiales del RFC**: si casan con ellos, casa con
todas las aplicaciones de autenticación que existen.

De los proyectos de la cantera, **solo uno lo tiene** — y el que más contratos, finanzas y
datos personales maneja entra con contraseña y nada más.

### Cuatro decisiones que están en el código, con su porqué

**TOTP y no un código por SMS o correo.** El canal es justo lo que falla: un segundo factor
que depende de un mensaje que a veces no llega es una forma nueva de quedarse fuera. Y el
SMS es interceptable por duplicado de tarjeta, que es un ataque real y barato.

**Sin biblioteca de terceros.** Son cuarenta líneas de aritmética y un HMAC. Una dependencia
para esto es superficie de suministro a cambio de nada.

**`comprobar` devuelve el período, no un booleano.** Es lo que permite guardar el último
usado y **rechazar el mismo código dos veces**. Sin eso, quien mira por encima del hombro
tiene treinta segundos para usarlo él.

**Una ventana de tolerancia, ni cero ni dos.** Con cero, un teléfono veinte segundos
desfasado —lo normal— hace fallar códigos correctos y la gente desactiva el segundo factor.
Con dos, la vida útil de un código robado se estira sin necesidad.

Y la comparación es de **tiempo constante**: comparar con `===` filtra por el tiempo de
respuesta cuántos dígitos iniciales se acertaron, y seis dígitos no dan margen para
regalarlo.

---

## Checklist

- [ ] `secretos.mjs` en verde — incluida la URL del remoto
- [ ] Ningún secreto en logs, informes ni mensajes de error
- [ ] Cada ruta que escribe tiene su autorización con nombre
- [ ] Toda entrada revalidada en servidor
- [ ] Recursos sensibles: comprobación de propiedad, no solo identificador opaco
- [ ] Cabeceras de seguridad y CORS revisados si cambió la exposición
- [ ] Auditoría de dependencias en verde, o su excepción documentada como `AD-*`
- [ ] Segundo factor disponible donde hay datos personales o dinero
- [ ] Un código de segundo factor **no vale dos veces** — se guarda el último período usado
