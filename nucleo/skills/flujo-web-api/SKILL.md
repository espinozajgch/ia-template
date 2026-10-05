---
name: flujo-web-api
description: Audita y endurece el flujo productor → API → web para evitar lecturas directas de fuentes, procesamiento pesado en consumidores, payloads sin límite, polling solapado y regresiones de latencia. Úsala al optimizar una web, una API o un productor de datos y antes de afirmar que el flujo está completamente desacoplado.
---

# Flujo web–API

Garantiza una frontera simple: el productor ingiere y prepara; la API entrega contratos
genéricos y acotados; la web presenta y combina esos datos sin reinterpretar fuentes ni
crear derivados persistentes.

Antes de actuar, lee las reglas del repositorio y, si existe,
`knowledge/wiki/skills/flujo-web-api.md`. Una excepción documentada del producto manda
sobre esta guía; no conviertas una excepción local en arquitectura general.

## Establecer el contrato de cierre

Define qué pantallas, procesos y repositorios entran y qué queda expresamente fuera. No uses
“100 %” como impresión: conviértelo en invariantes comprobables y enumera cualquier hueco.

Mide antes de cambiar, con datos representativos:

- cantidad, tamaño comprimido y descomprimido de respuestas;
- latencia total y, si es posible, consulta, serialización, transferencia y parseo;
- número de peticiones al cargar y durante un minuto de sondeo;
- CPU, memoria y lecturas de disco del servidor y del navegador;
- cardinalidad que hace crecer el coste: partidos, ejecuciones, eventos o temporadas.

Conserva el mismo escenario para la medición posterior. Gzip, ETag o caché pueden reducir
transferencia; no corrigen por sí solos una consulta, un payload o un parseo excesivos.

## Seguir el dato de extremo a extremo

Traza cada pantalla hasta su fuente. Comprueba con búsqueda estática, llamadas reales y
pruebas que:

1. solo el productor autorizado lee XML, CSV, Excel, dumps o zonas raw;
2. normalización, identidad, materialización y cálculos deportivos ocurren en el productor;
3. la API consulta datos preparados y expone recursos de dominio reutilizables;
4. la web consume la API y solo transforma lo necesario para presentar;
5. la web no ejecuta scripts del productor, no instala dependencias, no copia feeds y no
   genera ficheros derivados.

Trata imágenes y administración de ficheros como excepciones únicamente si el proyecto las
documenta. Aun entonces, no parsees esos recursos como fuente deportiva.

Busca tanto rutas obvias como fallbacks: acceso al lago, SDK de almacenamiento, rutas de
filesystem, parsers de proveedor, `subprocess`, descargas masivas y datos demo que oculten
la ausencia del contrato real. Añade una guarda estática o de contrato cuando una regresión
pueda reaparecer por importación o literal.

## Diseñar contratos genéricos y acotados

Prefiere filtros y recursos del dominio —temporada, competición, partido, equipo, rango,
estado— a endpoints nombrados por pantalla o producto. Un endpoint privado por consumidor
solo se justifica cuando la composición es realmente exclusiva y medir demuestra que el
contrato genérico no basta; mantenlo fuera de la documentación pública.

Todo listado de cardinalidad creciente necesita límites, paginación estable y total o cursor.
Evita descargar una temporada completa para encontrar un partido, o todo el historial para
pintar la primera página. Separa resumen ligero y detalle pesado. Para varias identidades,
prefiere un contrato batch acotado a N+1 peticiones desde el navegador.

No ocultes errores de contrato con fallbacks silenciosos. La API debe devolver códigos
estables y una causa útil y segura; la UI debe tolerar fechas inválidas, campos opcionales,
404 esperables y activos ausentes sin quedar en blanco.

## Controlar trabajo repetido

Cada sondeo debe cumplir:

- se pausa cuando la vista no está visible;
- usa single-flight o aborta la petición anterior;
- su intervalo responde al estado: activo puede ser frecuente, terminal casi nunca;
- no reabre logs ni artefactos inmutables de ejecuciones terminales;
- no repite catálogos por cambiar filtros sin relación;
- no sostiene locks globales mientras hace red, disco o base de datos;
- no multiplica peticiones por fila cuando existe una consulta filtrada o batch.

Los resúmenes operativos inmutables pueden persistirse una vez al terminar el trabajo. No
materialices datos deportivos en la web. No uses `localStorage` como base de datos ni
añadas cachés para maquillar una operación sin límite: invalida por identidad y versión,
acota tamaño/TTL y demuestra que la corrección sigue siendo válida con caché fría.

## Probar la corrección y la ausencia de regresión

Cubre al menos:

- límites, paginación, filtros e identidad del contrato;
- una respuesta grande y un histórico creciente;
- sondeos lentos que no se solapan;
- terminales que no vuelven a tocar disco o red;
- fuente incompleta, 404, fecha inválida y recurso gráfico ausente;
- prohibición de imports/rutas/parsers raw en consumidores;
- paridad del flujo visible y errores accionables.

Ejecuta primero pruebas focalizadas y después la puerta completa que usa CI. No rebajes
timeouts, presupuestos ni cobertura para hacerla pasar. Si un trinquete solo puede medir la
punta de Git, sigue la herramienta oficial del repositorio y deja un único commit final
validado. No hagas push, despliegue ni escribas en servicios externos sin autorización
explícita.

## Entrega

Informa con números comparables: antes/después, peticiones, bytes, latencia, CPU/memoria,
pruebas y puerta completa. Separa “corregido” de “documentado como siguiente paso”. Solo
declara 100 % cuando todos los invariantes del alcance están cubiertos y no queda un camino
directo a fuentes, una operación no acotada o una verificación pendiente.

