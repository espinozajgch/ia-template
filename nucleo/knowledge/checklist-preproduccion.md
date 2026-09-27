# Checklist de preproducción — las 13 puertas

> **Qué es.** El catálogo de lo que hay que comprobar antes de que un producto salga a
> producción, agrupado en trece puertas que se cruzan en orden. No es una lista de tareas
> para «añadir cien cosas»: es lo que un agente recorre para **decir en qué estado está
> cada requisito** y proponer un plan, sin tocar nada.
>
> **Cómo se usa.** Con la skill [`preproduccion`](../../.claude/skills/preproduccion/SKILL.md).
> Este fichero es el catálogo; el informe con los estados lo produce ella, por proyecto.
>
> **De dónde salió.** De recorrer lo que ya se había hecho a mano en `pulso`, `hipismo` y
> `ppsportmanagementarg`, y de una revisión del 2026-09-06 que midió qué decía el kit de
> cada punto. El resultado de aquella medición está en §4 y es incómodo a propósito.

---

## Los cuatro estados, y sólo cuatro

| Estado | Qué significa | Cuándo se usa |
|---|---|---|
| ✅ **PASS** | Existe, está bien hecho y se ha **comprobado** | Con evidencia: fichero y línea, o la salida de la comprobación |
| ⚠️ **PARTIAL** | Existe pero incompleto, o bien hecho en un sitio y no en otro | Se dice **qué falta**, no «mejorable» |
| ❌ **FAIL** | No existe, o existe y está mal | Se dice la consecuencia concreta, no el adjetivo |
| ➖ **N/A** | No aplica a este producto | **Con el motivo escrito.** Un `N/A` sin motivo es un `FAIL` disfrazado |

**No hay un quinto estado.** «Casi», «en curso» y «pendiente de revisar» son `PARTIAL` o
`FAIL`: el punto de la lista es que nada se quede en un limbo del que nadie decide salir.

**Sin evidencia no hay `PASS`.** Un `grep` vacío no prueba que algo esté bien; prueba que
ese `grep` no encontró nada. Es la misma regla de [`auditar`](../../.claude/skills/auditar/SKILL.md)
y aquí vale igual.

---

## Cómo leer la columna «El kit lo dice en»

- `` `ruta` `` — el kit lo trata **como regla**: está en el protocolo, en una skill, en un
  `rule.mdc` o en el `PACK.md` de un pack. Un agente lo va a leer.
- `` `ruta` ·p `` — sólo aparece en un **prompt**, que se carga a demanda. Sirve cuando
  alguien invoca ese prompt; no gobierna el trabajo diario.
- `—` — **el kit no dice nada**. El requisito sigue siendo válido; lo que falta es la regla.

### Las rutas están vistas DESDE EL KIT, no desde tu proyecto

Este fichero se escribió para medir el kit y se **instala** en los proyectos, así que sus
rutas son las del repositorio `ia-template`. En un proyecto instalado, el instalador las
reparte por otros sitios. La traducción, una vez:

| En esta tabla pone | En tu proyecto está en |
|---|---|
| `nucleo/protocolo/…` | `agente/protocolo/…` |
| `nucleo/skills/<n>/SKILL.md` | `.claude/skills/<n>/SKILL.md` (y `.agents/skills/…`) |
| `nucleo/knowledge/…` | `knowledge/wiki/…` |
| `packs/<p>/…` | `agente/packs/<p>/…` |
| `packs/<p>/rule.mdc` | `.cursor/rules/<p>.mdc` |
| `prompts/…` | `agente/prompts/…` |

**Y si un pack no está instalado, su regla no está.** La columna dice dónde *existe* la
regla en el kit, no dónde la vas a encontrar. Un requisito cuya única fuente es un pack que
no instalaste se comporta como un `—`: el requisito sigue siendo válido y no hay nada que lo
sostenga. Comprobar qué packs tienes es `ls agente/packs/`.

---

## G1 · Funcionalidad y formularios

> Un producto que no hace lo que promete no se arregla con nada de lo que viene después. Y el formulario es donde el usuario entrega algo: si falla ahí, lo pierde y no vuelve.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Flujos de usuario claros | Recorrer los tres flujos principales de punta a punta, como usuario, no leyendo el código | — |
| Onboarding | Entrar con una cuenta recién creada y sin datos: ¿sabe qué hacer? | — |
| Formulario de contacto | Existe y llega a un buzón que alguien lee | — |
| Dirección de contacto real | Enviar uno de verdad y comprobar que llega | — |
| Validación de formularios | Enviar vacío, con el máximo de caracteres y con el tipo equivocado | — |
| Validación de entradas | La validación vive en el SERVIDOR además de en la pantalla | `prompts/ARCHITECTURE_PROMPT.md` ·p |
| Mensajes de error | Dicen qué campo y qué hacer, no «datos inválidos» | `prompts/SECURITY_PROMPT.md` ·p |
| Mensajes de éxito | Confirman qué ocurrió, no sólo que ocurrió algo | — |
| Estado de envío correcto | La pantalla cambia: el usuario no vuelve a pulsar | — |
| Estado de error de envío | Lo escrito NO se pierde al fallar el envío | — |
| Página de Gracias | Destino tras el envío, indexable o no según convenga | `nucleo/tools/ciclos.mjs` ·p |
| Protección de contenido malicioso | Enviar `<script>` y `'; DROP TABLE` en cada campo de texto | `prompts/SECURITY_PROMPT.md` ·p |
| Sanitización / escape | Lo enviado se pinta escapado en TODA pantalla que lo muestre | `prompts/AUDITOR_FORENSE.md` ·p |
| Última actualización visible | Donde el dato caduca, se dice de cuándo es | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |

## G2 · UX, interfaz y sistema visual

> Aquí es donde un producto se siente terminado o a medio hacer. Casi nada de esto es difícil; lo que cuesta es acordarse, y por eso está en una lista.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Menú responsive / hamburguesa | Con el menú abierto: se cierra con Escape, atrapa el foco y no deja scroll detrás | `prompts/DESIGN_PROMPT.md` ·p |
| Cabecera fija | No tapa el contenido al saltar a un ancla | `packs/auditoria-informes/activos/informe-auditoria-formato.md` ·p |
| Botón volver arriba | Aparece al bajar, no siempre | — |
| Saltar al contenido | Primer tabulador de la página; visible al enfocarlo | — |
| Buscador interno | Si hay más de dos pantallas de listado | `prompts/RAG_PROMPT.md` ·p |
| Modales | Escape cierra, el foco queda dentro, al cerrar vuelve al disparador | `packs/frontend-web/PACK.md` |
| FAQs desplegables | `<details>` nativo antes que JavaScript | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |
| Mostrar/ocultar contraseña | Con `aria-pressed` y sin romper los gestores de contraseñas | — |
| Botón copiar | Confirma que copió; no deja al usuario dudando | — |
| CTA durante el scroll | La acción principal sigue alcanzable sin volver arriba | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Estados hover | Y su equivalente táctil: en un móvil `hover` no existe | `packs/frontend-web/rule.mdc` |
| Estados de foco | Visibles SIEMPRE. Quitar el `outline` sin sustituirlo es un fallo de accesibilidad | `packs/frontend-web/rule.mdc` |
| Barras de scroll personalizadas | Si se tocan, que sigan siendo agarrables | — |
| Transiciones | Y `prefers-reduced-motion` respetado | `prompts/RAG_PROMPT.md` ·p |
| Microinteracciones | Lo que confirma que el sistema recibió el gesto | — |
| Animaciones de scroll | Nunca condicionan que se vea el contenido: sin JS, el texto está | — |
| Animación del hero | No retrasa el LCP | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Animaciones de carga | Una acción que tarda más de 400 ms lo dice | — |
| Loading / skeleton | Del tamaño de lo que va a llegar, para que no salte el diseño | `packs/saas-multitenant/PACK.md` |
| Estados vacíos | Dicen qué hacer, no «sin resultados» | `packs/design-system/PACK.md` |
| Estados de carga | Distinguibles de «vacío» y de «error» | `packs/frontend-web/rule.mdc` |
| Estados de error | Con qué falló y qué puede hacer el usuario | `prompts/SECURITY_PROMPT.md` ·p |
| Experiencia sin conexión | Al menos: una pantalla propia en vez del error del navegador | `packs/offline-first/rule.mdc` |
| Modo oscuro | Si se ofrece, con contraste comprobado en los dos | `packs/frontend-web/PACK.md` |
| Selector de idioma | Si hay más de uno, y persiste entre visitas | `nucleo/skills/avanzar/SKILL.md` |
| Redes sociales | Si existen, que estén vivas | — |
| Testimonios | Reales y atribuibles, o ninguno | — |
| Design system | Tokens, no valores sueltos | `nucleo/skills/informe/SKILL.md` |
| Tipografía consistente | Una escala, no quince tamaños | `nucleo/skills/informe/SKILL.md` |
| Espaciados consistentes | Una escala, no márgenes a ojo | `packs/frontend-web/PACK.md` |
| Componentes reutilizables | El botón se escribe una vez | `prompts/DESIGN_PROMPT.md` ·p |
| Hoja de estilos coherente | Sin dos sistemas conviviendo sin plan de retirada | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Jerarquía visual | Lo importante se ve primero | `prompts/AUDITOR_FORENSE.md` ·p |
| Consistencia desktop/móvil | La misma decisión en los dos, no dos productos | `prompts/AUDITOR_FORENSE.md` ·p |

## G3 · Responsive

> No es «que quepa»: es que se pueda usar con un pulgar, en un teléfono de gama media y con mala red.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Diseño responsive | Sin scroll horizontal en ningún ancho entre 320 y 1920 | `nucleo/skills/informe/SKILL.md` |
| Experiencia móvil | Recorrer el flujo principal en un móvil real, no en el simulador | `nucleo/skills/blueprint/SKILL.md` |
| Breakpoints definidos | Pocos y nombrados; no uno por pantalla | `packs/frontend-web/PACK.md` |
| Revisión de botones y enlaces | 44×44 px de objetivo táctil, y separados entre sí | `packs/design-system/rule.mdc` |
| Comprobación entre navegadores | Safari incluido: es donde aparece lo que Chrome perdona | `packs/design-system/PACK.md` |

## G4 · Accesibilidad

> La mitad de esto se comprueba sin herramientas: desenchufa el ratón. Si no puedes usar el producto, nadie que dependa del teclado tampoco.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Accesibilidad | Un barrido automático (axe/Lighthouse) NO es suficiente: cubre un tercio | `nucleo/skills/estimar/SKILL.md` |
| Navegación por teclado | Todo el flujo principal sin tocar el ratón, y el orden de tabulación tiene sentido | `packs/design-system/rule.mdc` |
| Estados de foco | Visibles sobre todos los fondos | `packs/frontend-web/rule.mdc` |
| Contraste y legibilidad | 4,5:1 en texto normal, 3:1 en grande. Medido, no estimado | `packs/design-system/rule.mdc` |
| Texto ALT | Descriptivo en lo informativo, vacío en lo decorativo. Un alt inventado es peor que ninguno | `nucleo/knowledge/product-design.md` ·p |
| Jerarquía visual | Un solo `h1`, y los niveles sin saltos | `prompts/AUDITOR_FORENSE.md` ·p |
| Detección de errores visuales | Comparar capturas entre versiones, no revisar a ojo | — |

## G5 · Autenticación y cuentas

> El único gate donde un fallo no lo sufre quien lo cometió.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Registro | Y qué pasa si alguien lo repite con el mismo correo | — |
| Login | Mismo mensaje para usuario inexistente y contraseña mala: distinguirlos es enumerar cuentas | `prompts/CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` ·p |
| Verificación de email | Antes de conceder nada que importe | — |
| Recuperación de contraseña | Testigo de un solo uso, con caducidad, y guardado por su huella | — |
| Hash seguro de contraseñas | Argon2id y sólo argon2id (64 MiB, t=3, p=4). Nunca SHA de nada | `packs/seguridad/contrasenas.ts` ·p |
| Limitar intentos de login | Por cuenta Y por origen. Sin esto, la contraseña es lo único que protege | — |
| Reforzar autenticación / MFA | Al menos para los roles que gobiernan | `packs/seguridad/rule.mdc` |
| Protección de sesiones | Caducan, se renuevan, y se invalidan al cambiar la contraseña | `nucleo/protocolo/03_MEMORIA.md` |
| OAuth configurado | `state` comprobado, `redirect_uri` en lista blanca | `prompts/AUDITOR_FORENSE.md` ·p |
| Gestión de permisos | Qué puede cada rol, escrito y comprobable | `nucleo/protocolo/00_CICLO.md` |
| Autorización por rol | En el SERVIDOR. Ocultar un botón no es autorizar | `packs/frontend-web/PACK.md` |
| Eliminación de cuenta | Qué se borra, qué se conserva por obligación legal, y quién lo autoriza | `packs/datos-personales/rule.mdc` |

## G6 · Datos y base de datos

> El gate donde un descuido no da error: devuelve los datos de otro con estado 200.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Persistencia de datos | Migraciones versionadas y reversibles; nada de cambios a mano | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| RLS cuando aplique | Multiempresa: el aislamiento en la BASE, no en el código. Y comprobado con un rol que NO pueda saltárselo | `packs/base-de-datos/rule.mdc` |
| Controlar acceso a registros | Probar IDOR: pedir por identificador un registro de otro titular | `nucleo/skills/informe/SKILL.md` |
| Evitar permisos excesivos de BD | La aplicación NO conecta como propietaria ni como superusuario | `prompts/CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` ·p |
| Principio de mínimo privilegio | Cada proceso con lo justo: migrar, sembrar y servir son tres permisos distintos | — |
| Evitar manipulación de campos | Mass assignment: una lista blanca de campos, no el cuerpo entero | `prompts/APPSEC_PROMPT.md` ·p |
| Consultas parametrizadas | Nunca concatenar. Ni «sólo aquí» | `packs/api-backend/PACK.md` |
| Protección SQL Injection | Consecuencia de lo anterior; se comprueba aparte igualmente | — |
| Cifrado de datos sensibles | En reposo y en tránsito, y decidido POR COLUMNA | `packs/informes-pdf/rule.mdc` |
| Validar antes de persistir | Restricciones en la base además de en el código: una validación de formulario protege del formulario | `prompts/DATABASE_PROMPT.md` ·p |
| Copias de seguridad | Y una restauración probada. Un backup sin restaurar no es un backup | `packs/seguridad/PACK.md` |

## G7 · API y backend

> La superficie que nadie ve y por la que entra todo.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Autenticación de endpoints | Cada ruta con su puerta decidida por escrito, no por descuido | `nucleo/skills/blueprint/SKILL.md` |
| Validación de inputs | En el borde, con esquema, y rechazando lo que sobra | — |
| Sanitización de outputs | Cada rol recibe sólo lo que su función necesita | `packs/observabilidad/rule.mdc` |
| Limitar respuestas de API | Paginación y proyección: no devolver la tabla | `prompts/DATABASE_PROMPT.md` ·p |
| Rate limiting | Y compartido si hay más de una instancia | `prompts/AUDITOR_FORENSE.md` ·p |
| Ocultar claves API | Ninguna en el cliente. Buscarlas en el paquete compilado | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| No guardar secretos en Git | Y revisar el HISTORIAL, no sólo el árbol actual | `nucleo/protocolo/00_CICLO.md` |
| Separar claves públicas y privadas | Que el nombre lo diga | `packs/cloud-aws/PACK.md` |
| Gestión segura de secretos | Gestor de secretos y rotación; no variables copiadas a mano | `prompts/INFRA_ACCESS_PROMPT.md` ·p |
| Command injection | Nunca construir una orden del sistema con entrada del usuario | — |
| Deserialización insegura | No deserializar lo que llega de fuera en objetos con comportamiento | `prompts/APPSEC_PROMPT.md` ·p |
| Acceso arbitrario a archivos | Path traversal: normalizar y comprobar que la ruta cae dentro | `prompts/CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` ·p |
| Restringir acceso de IA a recursos | Un agente con credenciales es un usuario más: mínimo privilegio también ahí | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| IA sin acceso directo a la BD | Que consulte por la API, con las mismas puertas que todo el mundo | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |
## G8 · Seguridad

> Lo que no está en los otros gates y sigue siendo la diferencia entre un incidente y un martes.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Dependencias vulnerables | `npm audit --omit=dev` en la puerta, no cuando alguien se acuerde | `prompts/SECURITY_PROMPT.md` ·p |
| Paquetes maliciosos | Revisar lo que se añade: nombre parecido, mantenedor nuevo, script de instalación | `prompts/SECURITY_PROMPT.md` ·p |
| Headers de seguridad | Helmet o equivalente, y comprobados en la respuesta real | `packs/seguridad/PACK.md` |
| CSP | Sin `unsafe-inline`. Si hace falta, es que algo se puede arreglar | `prompts/CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` ·p |
| HSTS | Con `preload` sólo cuando el dominio esté decidido | `prompts/CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` ·p |
| HTTPS obligatorio | Y redirección desde HTTP | `nucleo/skills/informe/SKILL.md` |
| Cookies seguras | `HttpOnly`, `Secure`, `SameSite`. Las tres | `prompts/APPSEC_PROMPT.md` ·p |
| CSRF | Comprobación de origen además de `SameSite`: la defensa no depende de una sola capa | `prompts/APPSEC_PROMPT.md` ·p |
| XSS | Escapar por defecto; `dangerouslySetInnerHTML` y equivalentes, justificados uno a uno | `prompts/APPSEC_PROMPT.md` ·p |
| CORS restrictivo | Lista de orígenes, nunca `*` con credenciales | `packs/seguridad/PACK.md` |
| Paneles administrativos expuestos | ¿Se llega a la consola sin sesión? ¿Está indexada? | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |
| Aislamiento de servicios | Que un servicio comprometido no alcance a los demás | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Prompt injection | Lo que llega de un usuario NO es instrucción para un agente. Marcar la frontera | `prompts/LEARNING_ASSISTANT_PROMPT.md` ·p |
| Acceso excesivo de agentes/IA | Sólo lectura por defecto; escribir se pide explícitamente | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Exposición indebida de registros | Revisar qué sale en respuestas, en logs y en mensajes de error | `prompts/AUDITOR_FORENSE.md` ·p |
| Monitorización de seguridad | Alertas de 401, 403, 429 y 5xx. Un log que nadie mira no es monitorización | `packs/bot-automatizacion/PACK.md` |
| Auditoría de eventos de seguridad | Quién hizo qué, en una tabla que la aplicación no pueda reescribir | `nucleo/protocolo/01_REGLAS_DEL_AGENTE.md` |
| Code review | De lo que toca autenticación, datos o dinero, siempre | `packs/saas-multitenant/PACK.md` |
| Procedimiento de recuperación | Escrito y ENSAYADO. Un rollback que nadie probó no existe | `nucleo/protocolo/00_CICLO.md` |

## G9 · Privacidad y legal

> Barato de poner al principio y caro de retrofitar. Y en algunas jurisdicciones no es opcional.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Política de privacidad | Qué se recoge, para qué, cuánto se conserva y con quién se comparte | — |
| Términos y condiciones | Y accesibles antes de registrarse, no después | — |
| Banner de cookies | Sólo si hay cookies que lo exijan; y sin patrón oscuro | — |
| Consentimiento de cookies | Nada no esencial antes de obtenerlo | `prompts/APPSEC_PROMPT.md` ·p |
| Revocación del consentimiento | Tan fácil como darlo | `nucleo/skills/avanzar/SKILL.md` |
| Protección de datos sensibles | Inventario de qué se guarda, con su nivel y su base legal | `packs/datos-personales/rule.mdc` |
| Eliminación de cuenta/datos | Qué se borra y qué se bloquea por obligación legal — no es lo mismo | `packs/datos-personales/rule.mdc` |
| RGPD cuando corresponda | Los derechos del titular: acceso, portabilidad, rectificación, supresión, oposición | `packs/datos-personales/rule.mdc` |

## G10 · SEO

> Si el producto se descubre por buscador. Si no, casi todo esto es `N/A` y decirlo también vale.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Meta title por página | Distinto en cada una. Un título repetido es no tener título | `prompts/DESIGN_PROMPT.md` ·p |
| Meta description | Escrita, no generada por corte del primer párrafo | — |
| Optimización de metadatos | Con longitudes que no se corten | `prompts/ARCHITECTURE_PROMPT.md` ·p |
| Open Graph | Y comprobado con el depurador de la red donde se vaya a compartir | — |
| Canonical URLs | Donde haya parámetros o rutas duplicadas | `prompts/APPSEC_PROMPT.md` ·p |
| Sitemap.xml | Generado, no escrito a mano | — |
| Robots.txt | Y coherente con el sitemap | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |
| Jerarquía H1/H2/H3 | Sin saltos y con un solo `h1` | `prompts/MASTER_PROMPT.md` ·p |
| URLs descriptivas | Legibles y estables: cambiarlas después cuesta redirecciones | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |
| Texto ALT | Sirve al buscador y a quien no ve la imagen; el mismo trabajo | `nucleo/knowledge/product-design.md` ·p |
| Favicon | Y en los tamaños que piden los dispositivos | `prompts/PWA_PROMPT.md` ·p |
| Página 404 | Propia, con salida hacia algún sitio útil | `packs/pwa-movil/PACK.md` |
| Revisión SEO final | Sobre el sitio DESPLEGADO, no en local | `packs/datos-personales/PACK.md` |

## G11 · Rendimiento

> Se mide sobre lo desplegado y con red lenta. En un portátil rápido y localhost todo va bien.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Velocidad de carga | Lighthouse sobre el build de producción, no sobre `dev` | `prompts/AUDITOR_FORENSE.md` ·p |
| Core Web Vitals | LCP, CLS e INP. Con presupuesto escrito y vigilado en CI | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Optimizar imágenes | Formato moderno, tamaño servido = tamaño mostrado | `prompts/PWA_PROMPT.md` ·p |
| Compresión de imágenes | Y sin recomprimir lo ya comprimido | — |
| Lazy loading | En lo que está bajo el pliegue; NUNCA en el LCP | `prompts/AUDITOR_FORENSE.md` ·p |
| Code splitting | Que abrir una pantalla no descargue las otras once | `prompts/AUDITOR_FORENSE.md` ·p |
| Reducir JavaScript | Medir qué se descarga y no se usa | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Tamaño de bundles | Presupuesto por ruta, y que rompa la puerta al pasarse | `packs/pwa-movil/PACK.md` |
| Optimización de fuentes | Subconjunto, `font-display` y precarga de la del titular | `nucleo/protocolo/02_PUERTA_DE_CALIDAD.md` |
| Caché | `Cache-Control` decidido por tipo de recurso, no uno para todo | `packs/pwa-movil/PACK.md` |
| Compresión HTTP | Brotli o gzip en el servidor | `prompts/CLOUD_ARCHITECTURE_REMEDIATION_PROMPT.md` ·p |
| Recursos bloqueantes | Nada que bloquee el pintado sin motivo escrito | `prompts/DEVSECOPS_PROMPT.md` ·p |

## G12 · Analítica y observabilidad

> Lo que convierte «va lento» y «a veces falla» en algo que se puede arreglar.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Analítica web | Y con base legal para tenerla | `packs/datos-personales/PACK.md` |
| Parámetros UTM | Si hay campañas, que se puedan atribuir | — |
| Tracking de conversiones | Definir qué es una conversión ANTES de medirla | `packs/tasas-de-cambio/rule.mdc` |
| Eventos importantes | Los del negocio, no los que la herramienta trae de fábrica | — |
| Errores de frontend | Los del navegador del usuario llegan a algún sitio | `packs/pwa-movil/PACK.md` |
| Errores de backend | Con identificador de petición para poder cruzarlos | `nucleo/skills/tarea/SKILL.md` |
| Logs | Estructurados y sin datos personales dentro | `nucleo/protocolo/00_CICLO.md` |
| Monitorización | Con alerta a una persona; un panel que nadie abre no avisa | `prompts/_dominio/ANALSIS_HIPICO.md` ·p |
| Métricas de rendimiento | De producción, no de una medición de hace tres meses | `packs/api-backend/PACK.md` |
| Métricas de seguridad | 401, 403, 429 y 5xx, con umbral | `prompts/DESIGN_PROMPT.md` ·p |
| Auditoría | Quién hizo qué y cuándo, conservado con un plazo decidido | `nucleo/protocolo/01_REGLAS_DEL_AGENTE.md` |
| Reportar bugs | Un camino desde el producto hasta quien lo arregla | `packs/saas-multitenant/rule.mdc` |

## G13 · QA final

> No trae requisitos nuevos: comprueba que los doce anteriores siguen en pie SOBRE LO DESPLEGADO. Casi todo lo que se rompe entre local y producción se rompe aquí.

| Requisito | Cómo se comprueba | El kit lo dice en |
|---|---|---|
| Comprobación entre navegadores | Chrome, Safari y Firefox. Y un móvil de verdad | `packs/design-system/PACK.md` |
| Detección de errores visuales | Comparación de capturas contra la versión anterior | — |
| Revisión SEO final | Sobre el dominio definitivo | `packs/datos-personales/PACK.md` |
| Velocidad de carga | Medida sobre el despliegue, con red lenta simulada | `prompts/AUDITOR_FORENSE.md` ·p |
| Procedimiento de recuperación | Ensayar el rollback antes de necesitarlo | `nucleo/protocolo/00_CICLO.md` |
| Copias de seguridad | Restaurar una en un entorno aparte y comprobar que sirve | `packs/seguridad/PACK.md` |

---

## 4 · Qué decía el kit el 2026-09-06, medido

Antes de escribir esta lista se recorrieron los 176 ficheros que el kit **instala** —núcleo,
packs y prompts— buscando cada uno de los 159 requisitos. El resultado:

| | Requisitos | |
|---|---|---|
| Como **regla** (protocolo, skill, `rule.mdc` o `PACK.md`) | **68** | 43 % |
| Sólo mencionado en un **prompt**, que se carga a demanda | **56** | 35 % |
| **Sin ninguna mención** | **35** | 22 % |

Los 56 del medio son el hallazgo incómodo: **CSP, HSTS, CSRF, XSS, cookies seguras,
dependencias vulnerables y prompt injection** estaban sólo en prompts. Un prompt se lee
cuando alguien lo invoca; un `rule.mdc` lo lee el agente siempre. Que las cabeceras de
seguridad dependieran de que alguien se acordara de cargar `APPSEC_PROMPT.md` es la misma
forma de fallo que este kit señala en los proyectos: **la defensa existe y no está donde se
mira**.

Los 35 sin nada, por bloque:

- **Interfaz** — onboarding, flujos de usuario, volver arriba, saltar al contenido,
  mostrar/ocultar contraseña, botón de copiar, barras de scroll, microinteracciones,
  animaciones de scroll y de carga, redes sociales, testimonios.
- **Formularios** — el formulario de contacto entero: existencia, validación, mensajes de
  éxito, estados de envío y de error, y que la dirección de contacto sea real.
- **Autenticación** — registro, verificación de correo, recuperación de contraseña y
  límite de intentos. Cuatro piezas que todo producto tiene y ninguna regla nombraba.
- **Seguridad** — SQL injection y command injection **por su nombre**, y la validación de
  entradas en el borde.
- **Legal** — política de privacidad, términos y banner de cookies.
- **SEO** — sitemap, meta description y Open Graph.
- **Otros** — compresión de imágenes, UTM, eventos de negocio, regresión visual.

### Un hueco de forma, no de contenido

Los 23 packs cubren lo que salió de proyectos reales: multiempresa, datos personales,
tasas, PWA, facturación, RAG, observabilidad. **No hay ninguno de web pública** — SEO,
metadatos, contenido, conversión— y por eso G10 entero y parte de G12 no tienen dónde
apoyarse salvo esta lista. Es coherente con lo construido hasta ahora (todo son productos
con sesión) y deja de serlo el día que haya que sacar una landing.

> **Cómo se lee esto.** No es que el kit estuviera mal: cubría bien lo que había salido de
> proyectos reales —multiempresa, datos personales, tasas, PWA, facturación— y no cubría lo
> que aún no había mordido a nadie. Es exactamente la regla de crecimiento del kit
> funcionando: entra al núcleo lo que ha sido útil en dos proyectos. Esta lista es el otro
> lado de esa regla: **lo que hay que comprobar aunque todavía no haya dolido**.

---

## 5 · Qué se hace con el resultado

El informe de la skill termina en un plan, y el plan se ordena por **daño × esfuerzo**, no
por número de puerta:

1. **Lo que ya está roto en producción** — un `FAIL` en G5, G6, G7 o G8 va primero,
   siempre. Un fallo de aislamiento o de autorización no espera a que se arregle el SEO.
2. **Lo barato que cierra un `FAIL`** — media hora que quita un riesgo va antes que dos
   días que quitan otro parecido.
3. **Lo que sostiene lo demás** — un guardián que impide que un `PASS` vuelva a `FAIL` vale
   más que arreglar el caso concreto. Una regla en la puerta de calidad, un test, un
   trinquete.
4. **El resto**, por puerta.

**No se corrige mientras se revisa.** Una revisión que arregla a la vez no es una revisión:
es una refactorización con la excusa de una lista, y al terminar nadie sabe qué estaba mal
antes. Diagnóstico primero, plan después, y las correcciones de una en una con su
verificación.
