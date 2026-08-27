# Encargos — índice y estado

Órdenes de trabajo autocontenidas, una por proyecto, para dárselas a un agente que **no ha
visto la conversación en que se escribieron**. Cada carpeta lleva la fecha en que se
midieron sus datos.

> **Cerrados todos al 2026-08-27.** Los seis que había están resueltos. Se conservan en vez
> de borrarlos: saber qué se pidió, quién lo resolvió y qué se decidió por el camino vale
> más que una lista limpia. Lo que sigue abierto está abajo, y no son encargos —es trabajo
> nuevo.

| Tanda | Encargos | Estado |
|---|---|---|
| [2026-08-25](2026-08-25/) | uno por proyecto: comando único de verificación | ✅ los cinco cerrados — **tres los cerró otra sesión**, uno lo hice yo (futbot-v2) y el de pulso caducó |
| [2026-08-26](2026-08-26/) | facturación fiscal en hipismo, para vender al público | ✅ cerrado, incluida la impresión del documento |

## Las cinco puertas, ejecutadas el 2026-08-27

No recordadas: corridas ese día. Es lo que estos encargos perseguían.

| Proyecto | Puerta | Pruebas |
|---|---|---|
| pulso | ✅ | 1.511 · cobertura 93,80 / 89,16 / 89,87 |
| hipismo | ✅ | 759 unitarias + 811 e2e · 0 vulnerabilidades |
| futbot-v2 | ✅ | 2.246 pasan, 773 saltadas |
| futbot-web-app | ✅ | 222 · lint y tipos |
| ppsport | ✅ | 3.628 + 3.354 · trinquetes de diseño |

## Lo que sigue abierto, y NO es un encargo

Es trabajo nuevo, no deuda de estos encargos. Se anota aquí para que nadie lo confunda con
algo que quedó a medias.

- **La factura fiscal a las empresas cliente.** No existe en pulso ni en hipismo, y no es
  un olvido: la migración 037 de pulso lo dice por escrito junto a `plataforma_facturas`
  —«no es una factura fiscal… eso es otro trabajo y otra tabla»—. Llega el día que se
  cobre a una empresa venezolana. hipismo ya tiene el motor: numeración bajo bloqueo,
  rangos de imprenta y documento imprimible.
- **El documento de cobro de la suscripción en hipismo.** pulso lo tiene
  (`plataforma_facturas` + `plataforma_mensualidad()`), con la aritmética en **un solo
  sitio** porque la piden dos llamadores que no comparten lenguaje. Ese patrón se traslada.
- **Los cuatro derechos del titular en pulso.** Decididos el 2026-08-24, sin implementar, y
  con el orden fijado: acceso → portabilidad → supresión → oposición. Lo delicado es la
  supresión: lo clínico **se bloquea, no se borra** —destruir una historia destruye la
  prueba de lo que se le hizo al paciente, que también le protege a él—.
- **Pago móvil**, en los dos SaaS. Es el medio de pago dominante en Venezuela.

## Decisiones que no son de ingeniería

- **La región de alojamiento de pulso.** El único `PENDIENTE` que queda en su inventario de
  datos personales, y depende de una infraestructura que todavía no existe.
- **Rotar el token de GitHub** y quitar las credenciales embebidas de las URL de los
  remotos. `./verificar.sh` sale en rojo por eso, a propósito.

## Reglas que valen para cualquier encargo

- **Volver a medir antes de empezar.** En estos repositorios trabaja más de una sesión y el
  árbol cambia bajo los pies. Pasó dos veces esta semana: un encargo caducó solo y otra
  sesión se llevó una corrección mía dentro de su commit.
- **No hacer `push`.** En ninguno. Los commits locales son deseables; publicar es decisión
  del propietario, y varios de estos repositorios lo prohíben por escrito.
- **No instalar el kit entero.** Traer sólo lo que falta, nunca volcar todos los ficheros.
