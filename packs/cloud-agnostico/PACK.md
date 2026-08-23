# Pack · cloud-agnostico

**Se activa si:** el despliegue no debe atarse a un proveedor, o se quiere poder cambiar.

**Prompts:** `CLOUD_AGNOSTIC_PROMPT.md` · `DEVSECOPS_PROMPT.md`

---

## Reglas

### El esqueleto está escrito

[`puertos/`](puertos/README.md): el puerto, dos adaptadores (disco y memoria), la factoría
y **el test de contrato que corre contra todos los adaptadores** — que es lo que impide el
«funciona en local y no en la nube». 16 tests verdes.

### El bloqueo se decide, no se hereda

Usar el servicio gestionado de un proveedor está bien **si se decidió**. Lo que sale caro
es descubrirlo el día de la migración. Cada dependencia propietaria se anota como `ADR` con
su coste de salida estimado.

### La aplicación no conoce al proveedor

El código habla con interfaces —almacenamiento, cola, secretos, correo— y la implementación
concreta se elige por configuración. La consecuencia práctica: **se puede correr entero en
local**, que es lo que de verdad acelera el desarrollo.

### Contenedor como unidad de despliegue

Lo que corre en local, en pruebas y en producción es la misma imagen, con distinta
configuración. Toda la configuración por entorno.

### Estado fuera del proceso

Sesiones, caché y ficheros subidos no viven en el disco de la instancia. En cuanto hay dos
instancias, el estado local se convierte en un fallo intermitente imposible de reproducir.

### Salud y arranque, explícitos

Sondas de vida y de disponibilidad separadas, y apagado ordenado que termina lo que estaba
en curso. Sin esto, cada despliegue pierde peticiones.

### Observabilidad por estándar abierto

Registros estructurados, métricas y trazas por un formato estándar. El panel del proveedor
es un consumidor, no el sitio donde vive la instrumentación.

---

## Checklist

- [ ] Cada dependencia propietaria está en un `ADR` con su coste de salida
- [ ] El sistema arranca entero en local sin credenciales de nube
- [ ] Ningún estado en el disco de la instancia
- [ ] Sondas de vida y disponibilidad, y apagado ordenado
- [ ] Configuración por entorno, imagen única
