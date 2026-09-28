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

## Contraseñas

`contrasenas.ts` y su gemelo `contrasenas.py` — **argon2id, formato PHC, un solo estándar
para todos los proyectos**: 64 MiB, 3 pasadas, 4 carriles. 11 pruebas en TypeScript y 6 en
Python, y la que importa es la cruzada: cada lado verifica un hash fijo escrito por el otro.

Hasta el 2026-09-27 el kit decía «Argon2id **o** bcrypt», y cinco proyectos acabaron con
cinco maneras de guardar una contraseña —bcrypt, bcrypt, PBKDF2, scrypt y argon2—, dos por
debajo del mínimo de OWASP. Una regla con dos respuestas no es una regla.

### Cuatro decisiones, con su porqué

**Argon2id y ningún otro.** Es la primera recomendación de OWASP y de la RFC 9106: cuesta
memoria además de CPU, y la memoria es lo que no se abarata en una GPU. bcrypt corta en
silencio a los 72 bytes; PBKDF2 y scrypt son aceptables sólo con parámetros que nadie
recuerda y que ninguno de los dos guardaba en el hash.

**Los parámetros por defecto de las bibliotecas, pero escritos.** 64 MiB / t=3 / p=4 es lo
que producen `argon2` (Node) y `argon2-cffi` (Python) sin configurar nada, así que lo que
ya existía no se re-hashea. Se escriben igual: si la biblioteca cambia sus valores, el
estándar no cambia con ella. Cuestan ~64 MiB por inicio de sesión: **sin limitador de
intentos, esto es además una forma de tumbar el servidor.**

**Se migra al entrar, no con un correo a todo el mundo.** El formato viejo se declara como
`Legado`, que sólo sabe verificar. Cuando alguien entra con éxito, `verificarContrasena`
devuelve `necesitaRehash` y el proyecto guarda en ese momento el hash nuevo. Cuando ya no
queda ningún hash viejo en la base —se cuenta con una consulta—, se borra el `Legado`.

**Re-hash sólo hacia arriba.** Un argon2 más fuerte que el estándar no se toca.
`check_needs_rehash` de argon2-cffi compara por igualdad y lo rebajaría.

Y cuando la cuenta no existe, `verificarEnVacio`: si «no existe» contesta en 1 ms y
«contraseña mala» en 60, el formulario de acceso dice qué correos están registrados.

### Instalación

- Node: `npm i @node-rs/argon2` —binarios precompilados, también para Alpine, sin scripts de
  instalación—. En Next.js ya está en `serverExternalPackages` por defecto. Si el proyecto
  ya usa `argon2`, puede quedarse: el formato es el mismo y se verifican entre sí.
- Python: `argon2-cffi`.
- El trinquete: `detectores/contrasenas.sh instalar`. Cuenta las llamadas a bcrypt, scrypt y
  PBKDF2, y sólo deja que bajen.

---

## Sesiones

`sesiones.ts` — el criterio común en piezas puras (13 pruebas): cada proyecto las conecta
a su tabla y a su framework. A 2026-09-28 había cinco implementaciones y ninguna cumplía
todo; cada regla de abajo la tenía bien al menos una.

1. **Testigo opaco de 256 bits** (`nuevoTestigo`). Un UUID son 122.
2. **En la base sólo su huella** (`huellaDeTestigo`). Un UUID como clave primaria de
   `sessions` es el testigo en claro: un respaldo filtrado son sesiones válidas.
3. **Forma comprobada antes de consultar** (`tieneFormaDeTestigo`): una cookie manipulada
   da 401, no 500.
4. **Cookie `HttpOnly`, `Path=/`, `SameSite`, y `Secure` por configuración** del despliegue,
   nunca por cabeceras de la petición. Con `Secure`, **prefijo `__Host-`**, que ata la
   cookie al origen (`nombreDeCookie`). Nunca el prefijo sin `Secure`: el navegador
   descarta la cookie y nadie puede entrar, sin ningún error que mirar.
5. **Doble caducidad**: por inactividad (se renueva con cada petición) **y** un máximo
   absoluto (`vigencia`). Sólo deslizante, una pestaña abierta no caduca nunca; sólo
   absoluta, se echa a quien está trabajando. La caducidad nueva se escribe en la base y
   en la cookie a la vez.
6. **Cada petición revalida** la cuenta y, si hay empresas, la empresa: desactivar una
   cuenta corta su sesión en la siguiente petición, no cuando caduque.
7. **Se revoca**: al cerrar sesión (fila y cookie, esta con los mismos atributos con los
   que se emitió, `cookieBorrada`); al cambiar la contraseña, todas las demás; al
   recuperarla, todas; al desactivar la cuenta, todas.
8. **Las escrituras comprueban el origen** (`mismoOrigen`) además de `SameSite`.

| Regla | ElevenOffice | futbot-web-app | Pulso | hipismo | Logroño |
|---|---|---|---|---|---|
| 1-2 · testigo y huella | JWT + `jti` con huella | JWT firmado + `sid` | **UUID en claro** | ✅ | ✅ |
| 4 · `__Host-` | no | no | no | ✅ | no |
| 5 · doble caducidad | acceso 15 min + refresco 24 h | 8 h fija | 8 h fija | **sólo deslizante** | fija (12 h / 30 días) |
| 7 · revoca al cambiar la clave | ✅ | ✅ | ✅ | ✅ | no hay cambio de clave |
| 8 · origen | ✅ (`requireSameOrigin`) | — | ✅ | — | — |

«—» es que no se revisó, no que falte.

---

## Intentos de acceso

`limite-intentos.ts` (13 pruebas) y `limite-intentos.sql` (probado contra PostgreSQL). A
2026-09-28 había seis implementaciones; la base es la de Pulso, con tres mejoras que ya
estaban en otros proyectos.

1. **Por cuenta, siempre**: es el contador que de verdad frena la prueba de contraseñas, y
   también la contraseña frecuente probada contra muchas cuentas desde muchas IP. Cuenta
   lo tecleado **exista o no la cuenta**: si sólo contara las reales, el 429 diría «esta
   cuenta existe» (hipismo).
2. **Por IP, sólo si es atribuible** (proxy de confianza declarado). Si no, la IP que llega
   puede ser la del balanceador y el contador, compartido por todo el mundo, niega el
   acceso a todo el mundo.
3. **En la base, y el fallo se registra atómicamente** (`registrar_fallo_de_acceso`). En
   memoria, reiniciar borra los bloqueos y varias réplicas multiplican el límite.
4. **La clave es una huella**: la tabla no guarda correos en claro (de Logroño).
5. **Espera creciente con techo**: 1, 2, 4… minutos, hasta una hora, con el exponente
   acotado antes de elevar. Nunca un bloqueo permanente: quien conoce el correo de otro
   lo retrasa, no lo echa.
6. **Sólo el 401 cuenta como fallo** (`cuentaComoFallo`, de hipismo): un 400, un 403 o el
   propio 429 no gastan intentos del titular.
7. **Un acierto limpia la cuenta, no la IP.** Y la administración puede **levantar un
   bloqueo sin tocar la contraseña**, viendo antes quién está bloqueado.
8. **Se consulta antes de verificar la contraseña**: un intento bloqueado no cuesta una
   derivación. La respuesta es 429 con `Retry-After`, y el mensaje dice que espere, no
   que los datos son incorrectos.
9. **Cupo de derivaciones por proceso** (`crearCupo`), aparte: protege la CPU y la
   memoria, y cuando se llena rechaza ESA petición, no bloquea a nadie.

| Regla | ElevenOffice | futbot-web-app | Pulso | hipismo | Logroño |
|---|---|---|---|---|---|
| 3 · en la base | memoria, Redis opcional (AD-31) | ✅ | ✅ | ✅ (memoria sólo si la base cae) | ✅ |
| 4 · clave como huella | — | — | **correo en claro** | — | ✅ |
| 7 · desbloqueo por la administración | — | — | ✅ | — | no |
| 9 · cupo con espera máxima | — | — | ✅ | — | sin espera máxima |

---

## Checklist

- [ ] `secretos.mjs` en verde — incluida la URL del remoto
- [ ] Ningún secreto en logs, informes ni mensajes de error
- [ ] Cada ruta que escribe tiene su autorización con nombre
- [ ] Toda entrada revalidada en servidor
- [ ] Recursos sensibles: comprobación de propiedad, no solo identificador opaco
- [ ] Cabeceras de seguridad y CORS revisados si cambió la exposición
- [ ] Auditoría de dependencias en verde, o su excepción documentada como `AD-*`
- [ ] Contraseñas con `contrasenas.ts`/`.py`: argon2id, y el trinquete `hash-legado` en la puerta
- [ ] El login verifica en vacío cuando la cuenta no existe, y va detrás de un limitador de intentos
- [ ] Sesión: testigo de 256 bits guardado como huella, cookie `__Host-` con `Secure`, doble caducidad (`sesiones.ts`)
- [ ] Sesión: se revoca al cerrar, al cambiar o recuperar la contraseña y al desactivar la cuenta
- [ ] Intentos: por cuenta en la base, clave como huella, espera con techo, sólo el 401 cuenta (`limite-intentos.ts`)
- [ ] Segundo factor disponible donde hay datos personales o dinero
- [ ] Un código de segundo factor **no vale dos veces** — se guarda el último período usado
