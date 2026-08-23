# Prompt reutilizable de portabilidad cloud

Sirve para cualquier repositorio con API propia y base de datos relacional
gestionada por migraciones. Sustituye los marcadores entre corchetes antes de
usarlo; si un punto ya está resuelto en ese repositorio, el agente debe decirlo
y no tocarlo.

```text
Actúa como Staff Platform Engineer.

Inspecciona [REPOSITORIO] y descubre el stack: lenguaje, framework HTTP, ORM,
motor de datos, autenticación, empaquetado, CI y despliegue actual. No asumas
proveedor, framework ni rutas: léelas del repositorio.

OBJETIVO
Hacer la aplicación portable entre [PROVEEDOR ACTUAL] y [DESTINOS PREVISTOS]
—contenedor y servidor propio incluidos— sin cambiar reglas de negocio,
modelo de datos, endpoints, autenticación ni comportamiento del frontend.
El proveedor debe quedar como un detalle de despliegue, no como una dependencia
del código.

MODO
- Primero diagnóstico: qué ata hoy el código a un proveedor, con archivo y línea.
- Cada cambio propuesto se justifica arquitectónicamente; sin parches ni
  adaptadores temporales.
- Prohibido introducir ramas por proveedor (`if (esProveedorX)`) en el dominio.
- Si un punto no aplica al repositorio, declararlo y seguir.

DIAGNÓSTICO
1. Acoplamientos: SDK, variables, rutas de archivos, límites de ejecución,
   dependencias de red y funciones propietarias del proveedor.
2. Arranque: dónde se construye la aplicación HTTP y dónde se abre el puerto.
3. Configuración: variables leídas, cuáles llevan nombre de proveedor y cuáles
   se validan al arrancar.
4. Persistencia: cadena de conexión, agrupación de conexiones, migraciones y
   cuántas instancias del cliente se crean por proceso.
5. Estado fuera del proceso: archivos, sesiones, caché, colas y trabajos
   programados. Cualquiera de ellos en memoria o en disco local ata la app a
   una máquina.
6. Frontera de confianza: proxy inverso, cabecera de IP real, cookies, CORS y
   orígenes permitidos.

CAMBIOS A PROPONER
1. Separar la construcción de la aplicación del arranque del servidor: un módulo
   exporta la aplicación —middlewares, rutas, errores— sin abrir puerto, y otro
   la escucha. El punto de entrada de cada proveedor importa el primero. La
   lógica existe una sola vez.
2. Conservar la ejecución tradicional del repositorio —desarrollo, compilación y
   arranque— sin depender de ningún proveedor.
3. Variables de entorno con nombres neutrales, validadas y documentadas.
   Ninguna con prefijo de proveedor en el código; si el entorno las inyecta, se
   traducen en un único punto de configuración.
4. Base de datos: cadena de conexión y, si el ORM lo requiere, conexión directa
   para migraciones. Debe servir a cualquier PostgreSQL gestionado o propio sin
   tocar código. Cliente único por proceso.
5. Almacenamiento de archivos tras un puerto propio (`ObjectStorage` o
   equivalente) con adaptadores por proveedor y uno local. El dominio nunca
   importa el SDK.
6. Trabajos programados: los procesos se invocan por comando y no dependen del
   planificador. El planificador —CI, cron, tarea del proveedor— solo los llama.
7. Contenedor reproducible aunque no se use hoy: construir y ejecutar sin
   cambiar código, con imagen apta para orquestadores y servidor propio.
8. Cookies y sesión: confianza en proxy configurable, `Secure`, `SameSite` y
   `HttpOnly` coherentes detrás de balanceador, CDN o proxy. No romper la
   autenticación existente.
9. Secretos: leídos del entorno. La integración con un gestor de secretos es un
   adaptador, no una condición para arrancar.
10. Observabilidad por salida estándar; el destino de los registros lo decide la
    infraestructura.

RESTRICCIONES
- No cambiar reglas de negocio, modelo de datos, migraciones ya aplicadas,
  endpoints públicos, permisos, aislamiento multiempresa ni el comportamiento
  del frontend.
- No romper procesos de datos existentes —ingestas, reconciliaciones,
  exportaciones—: mismos algoritmos, mismas normalizaciones, mismas huellas.
- No eliminar flujos de CI; actualizarlos si hace falta.
- No mover archivos sin necesidad ni añadir dependencias que no resuelvan un
  acoplamiento concreto.
- Antes de cualquier cambio que rompa compatibilidad: justificarlo y proponer la
  alternativa portable.

ENTREGA
- Diagnóstico con los acoplamientos encontrados y su archivo.
- Cambios aplicados, uno por acoplamiento, con su justificación.
- Archivos de despliegue necesarios para cada destino previsto.
- Documento de portabilidad: arquitectura, adaptadores, flujo de arranque,
  variables y pasos de despliegue por destino.
- Riesgos detectados y mejoras futuras.

CRITERIO DE ÉXITO
Cambiar de proveedor exige solo infraestructura, configuración y despliegue:
ni el dominio ni la API se reescriben. Verificarlo arrancando la aplicación al
menos de dos formas distintas —la tradicional del repositorio y la del
contenedor— con el mismo código.
```
