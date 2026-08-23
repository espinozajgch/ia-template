# Prompt maestro — Aplicación OCR para revistas hípicas escaneadas

> Prompt **de proyecto**, no reutilizable: fija stack, proveedores y estructura a
> propósito. La regla de `docs/DOCUMENTATION_INDEX.md` sobre prompts sin stack ni
> proveedores fijos se aplica a los de `llm-wiki/*_PROMPT.md`, no a este.

## Rol

Actúa como arquitecto de software senior, desarrollador Python especializado en procesamiento documental, OCR, visión por computador, extracción estructurada de datos y despliegue cloud portable.

Debes analizar el repositorio existente, definir un plan y desarrollar una aplicación independiente para procesar revistas hípicas escaneadas en PDF.

No te limites a generar ejemplos o pseudocódigo. Implementa una solución funcional, ejecutable, probada, documentada y desplegable.

1. Objetivo general

Construir una aplicación Python independiente que permita:

cargar una revista hípica escaneada en PDF;
cargar además una imagen suelta con los resultados de una jornada;
convertir sus páginas en imágenes;
identificar qué páginas corresponden a carreras, publicidad, portada u otros contenidos;
extraer datos mediante OCR y reglas deterministas;
mostrar los datos extraídos en una interfaz;
permitir su revisión y corrección manual;
guardar la trazabilidad de cada campo;
exportar los resultados en formatos estructurados;
integrarse en el futuro con la API de Hípica 3×6;
desplegarse inicialmente en servicios gratuitos;
migrar después a AWS, GCP, Azure, Docker o un VPS sin reescribir el núcleo.

La aplicación no debe depender de un LLM.

2. Documento de referencia

El sistema debe poder procesar PDFs escaneados semejantes a una edición de Gaceta Hípica.

Características observadas en el documento de referencia:

PDF escaneado sin capa de texto.
18 páginas **en la edición observada**; el número varía entre ediciones y no
debe convertirse en una suposición del código.
Portada.
Varias páginas de publicidad.
Páginas de programación de carreras.
Tablas muy densas.
Tipografía pequeña.
Variaciones de inclinación, perspectiva y calidad.
Información distribuida por posiciones visuales.
Bloques de traqueos.
Favoritos.
Ranking “Por Rating”.
Estadísticas de jinete y entrenador.
Mejores ejemplares por distancia.
Participantes, peso, jinete, entrenador y actuaciones.
Número de carrera, hora, distancia, premios y condiciones.
Pools, válidas y modalidades asociadas.

No asumir que todo el contenido puede extraerse correctamente aplicando OCR a la página completa.

3. Restricciones fundamentales
3.1 Sin LLM

No utilizar:

OpenAI;
Claude;
Gemini;
Bedrock;
modelos generativos;
APIs externas de interpretación semántica;
OCR basado en LLM;
procesamiento dependiente de prompts.

La solución debe basarse en:

PyMuPDF o herramientas equivalentes;
OpenCV;
Tesseract;
PaddleOCR opcional;
expresiones regulares;
coordenadas;
detección de layout;
reglas de dominio;
diccionarios;
fuzzy matching;
validación humana.
3.2 Cloud-agnostic

No acoplar el núcleo a:

Gradio;
Streamlit;
Hugging Face;
Supabase;
AWS;
GCP;
Azure;
Vercel;
Render.

Los proveedores deben implementarse como adaptadores.

3.3 No procesar de forma síncrona una revista completa en una petición HTTP

El procesamiento debe modelarse como un trabajo con estados.

UPLOADED
QUEUED
PREPROCESSING
CLASSIFYING
OCR_PROCESSING
PARSING
VALIDATING
REVIEW_REQUIRED
APPROVED
EXPORTED
FAILED

Para el MVP gratuito puede ejecutarse mediante un worker local dentro del mismo proceso, pero la arquitectura debe permitir reemplazarlo después por una cola.

4. Stack recomendado
Lenguaje
Python 3.11 o 3.12
Interfaz inicial

Preferencia:

Gradio

Como alternativa secundaria:

Streamlit

La interfaz elegida debe permanecer aislada del núcleo.

Procesamiento documental
PyMuPDF.
OpenCV.
Pillow.
NumPy.
Tesseract OCR.
PaddleOCR como motor opcional o fallback.
RapidFuzz para normalización.
Pydantic para contratos y validaciones.
Persistencia inicial

Para desarrollo local:

SQLite

Debe existir compatibilidad futura con PostgreSQL mediante una capa de repositorios o SQLAlchemy.

Exportación
JSON.
CSV.
Excel opcional.
ZIP con evidencias.
API HTTP en una fase posterior.
Calidad
pytest.
mypy o pyright.
Ruff.
Black.
pre-commit opcional.
Despliegue
Docker.
Hugging Face Spaces inicialmente.
Streamlit Community Cloud como alternativa.
Compatible posteriormente con AWS ECS, AWS Batch, AWS Lambda por página, Google Cloud Run y Cloud Run Jobs.
5. Arquitectura requerida

Utilizar una separación clara entre dominio, aplicación, infraestructura e interfaz.

Estructura sugerida:

```text
hipica-document-ocr/
├── app/
│   ├── domain/
│   │   ├── models/
│   │   ├── enums/
│   │   ├── value_objects/
│   │   └── exceptions/
│   │
│   ├── application/
│   │   ├── services/
│   │   ├── use_cases/
│   │   ├── ports/
│   │   └── dto/
│   │
│   ├── infrastructure/
│   │   ├── pdf/
│   │   ├── image/
│   │   ├── ocr/
│   │   ├── parsers/
│   │   ├── persistence/
│   │   ├── storage/
│   │   └── queues/
│   │
│   ├── interfaces/
│   │   ├── gradio/
│   │   ├── cli/
│   │   └── api/
│   │
│   └── config/
│
├── templates/
│   └── gaceta_hipica/
│       ├── layout.yaml
│       ├── anchors.yaml
│       ├── parsers.yaml
│       └── dictionaries/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── golden_files/
│
├── data/
│   ├── uploads/
│   ├── working/
│   ├── exports/
│   └── models/
│
├── docs/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
├── README.md
└── .env.example
```

No es obligatorio seguir literalmente la estructura, pero debe mantenerse la separación de responsabilidades.

6. Ports & Adapters

Crear contratos abstractos para:

```python
class DocumentSourcePort(Protocol):
    """Entrega páginas como imágenes, vengan de un PDF o de un archivo suelto."""
    ...

class PdfRendererPort(Protocol):
    ...

class ImagePreprocessorPort(Protocol):
    ...

class OcrEnginePort(Protocol):
    ...

class DocumentRepositoryPort(Protocol):
    ...

class ObjectStoragePort(Protocol):
    ...

class JobQueuePort(Protocol):
    ...

class ExporterPort(Protocol):
    ...
```

Implementaciones iniciales:

PyMuPdfRenderer
ImageFileSource
OpenCvPreprocessor
TesseractOcrEngine
PaddleOcrEngine (opcional: solo si se activa el motor de respaldo)
SqliteDocumentRepository
LocalObjectStorage
InlineJobQueue
JsonExporter
CsvExporter

Implementaciones futuras contempladas, pero no necesariamente completas:

PostgresDocumentRepository
S3ObjectStorage
GcsObjectStorage
SupabaseStorageAdapter
SqsJobQueue
PubSubJobQueue
RedisJobQueue

El dominio no debe importar SDK de proveedores.

7. Pipeline documental

Implementar el siguiente pipeline:

PDF
 ↓
validación del archivo
 ↓
hash SHA-256
 ↓
detección de duplicado
 ↓
renderizado página por página
 ↓
preprocesamiento de imagen
 ↓
clasificación de página
 ↓
detección de regiones
 ↓
OCR por región
 ↓
parsing determinista
 ↓
normalización
 ↓
validación de dominio
 ↓
cálculo de confianza
 ↓
revisión humana
 ↓
exportación
8. Carga y validación del PDF

Al subir el archivo:

verificar que sea un PDF válido;
calcular tamaño;
contar páginas;
calcular SHA-256;
detectar duplicados;
almacenar el original;
crear un identificador de ingesta;
registrar fecha, nombre y versión del parser.

Límites configurables:

MAX_PDF_SIZE_MB=50
MAX_PDF_PAGES=30
PDF_RENDER_DPI=300

No cargar todas las páginas simultáneamente en memoria.

9. Renderizado

Usar PyMuPDF para convertir cada página individualmente.

Requisitos:

PNG.
250–350 DPI configurables.
nombres deterministas;
borrado o liberación de memoria tras procesar cada página;
registro de dimensiones;
generación opcional de miniaturas.

Ejemplo:

working/{ingestion_id}/pages/page-001.png
working/{ingestion_id}/pages/page-001-thumb.png
10. Preprocesamiento con OpenCV

Implementar un pipeline configurable:

conversión a escala de grises;
detección y recorte de márgenes;
corrección de inclinación;
corrección de perspectiva;
reducción de ruido;
contraste local;
CLAHE opcional;
binarización Otsu;
binarización adaptativa;
eliminación de líneas cuando sea necesario;
reescalado de regiones pequeñas.

Generar, cuando resulte útil:

original
grayscale
enhanced
binary

El motor debe poder elegir la variante más adecuada por región.

11. Clasificación de páginas

Tipos mínimos:

COVER
RACE
RESULTS
ADVERTISEMENT
WORKOUTS
OTHER
UNKNOWN

Primera implementación mediante reglas, sin modelos generativos.

Ejemplos de anclas para una página de carrera:

Carrera
DISTANCIA
Premios
Nuestros Favoritos
Por Rating

Publicidad:

baja densidad de texto tabular;
ausencia de “DISTANCIA”;
grandes bloques de imagen;
teléfono, logos o mensajes promocionales;
ausencia de filas de participantes.

Portada:

Gaceta Hípica
Edición
Fecha

Guardar:

page_type
confidence
matched_anchors
classification_version
12. Sistema de plantillas

Crear un sistema configurable de plantillas por publicación.

Ejemplo:

templates/gaceta_hipica/layout.yaml

Debe permitir definir:

regiones relativas;
anclas;
expresiones regulares;
campos;
tipos de página;
versiones de plantilla;
DPI de referencia;
umbrales.

Usar coordenadas relativas:

```yaml
header:
  x: 0.05
  y: 0.03
  width: 0.90
  height: 0.20
```

No depender de coordenadas absolutas.

Combinar:

plantilla aproximada
+
ajuste mediante anclas detectadas
13. OCR por regiones

No ejecutar únicamente OCR global.

Ejecutar OCR separado para:

cabecera;
condiciones;
tabla de participantes;
estadísticas laterales;
favoritos;
rating;
traqueos;
observaciones;
pool o válidas.

Cada región puede tener:

preprocesamiento distinto;
PSM distinto en Tesseract;
diccionario distinto;
motor OCR distinto;
umbral distinto.

El resultado OCR debe contener:

texto
palabras
confianza
bounding boxes
líneas
motor
versión
imagen procesada
14. Motores OCR

Crear una interfaz común:

```python
class OcrEnginePort(Protocol):
    def recognize(
        self,
        image_path: Path,
        options: OcrOptions,
    ) -> OcrResult:
        ...
```

Implementar inicialmente:

TesseractOcrEngine

Permitir activar opcionalmente:

PaddleOcrEngine

Configurable:

OCR_ENGINE=tesseract
# Vacío por defecto: PaddleOCR es opcional y añade peso a la imagen. Se activa
# poniendo aquí `paddle` cuando el respaldo compense.
OCR_FALLBACK_ENGINE=
OCR_LANGUAGE=spa

No introducir lógica de negocio dentro de los motores OCR.

15. Extracción inicial de datos

La primera versión debe concentrarse en campos de valor alto y dificultad moderada.

Datos de jornada
publicación;
fecha de edición;
hipódromo;
fecha de la jornada.
Datos de carrera
número;
denominación ordinal;
hora;
día;
tipo;
nombre del clásico, cuando exista;
grado;
distancia;
premios;
condiciones;
número de válida;
pool;
modalidad.
Participantes
número;
nombre del ejemplar;
jinete;
peso;
entrenador, cuando pueda identificarse;
stud, como campo opcional;
sexo o edad, como campo opcional.
Predicciones
favoritos de la publicación;
orden del ranking;
“Por Rating”;
participantes seleccionados;
fuente;
posición del pronóstico.
Traqueos

En la primera versión:

ejemplar;
distancia del entrenamiento;
tiempo;
texto original;
página;
confianza.

No intentar resolver inicialmente todos los históricos pequeños de cada caballo si compromete la estabilidad del MVP.

16. Parsing determinista

Utilizar:

expresiones regulares;
diccionarios;
mapas de ordinales;
reglas posicionales;
validación de tipos;
catálogos;
fuzzy matching.

Ejemplos de patrones:

\b\d{2}/\d{2}/\d{2,4}\b
DISTANCIA:\s*([\d.]+)\s*METROS
Premios:\s*Bs\.?\s*([\d.,]+)
\b\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\b

Normalizar los ordinales:

Primera → 1
Segunda → 2
Tercera → 3
...
Decimotercera → 13
17. Detección de filas de participantes

Implementar una estrategia basada en:

localizar la columna de números;
detectar números de participante;
ordenar por coordenada vertical;
dividir la tabla en franjas horizontales;
dividir cada franja en columnas;
ejecutar OCR por subregión;
reconstruir el participante.

No tratar toda la tabla como texto lineal.

Guardar las coordenadas de cada fila y campo.

18. Diccionarios y fuzzy matching

Crear diccionarios versionados para:

ejemplares;
jinetes;
entrenadores;
studs;
hipódromos;
términos hípicos;
ordinales;
modalidades;
clásicos.

Usar RapidFuzz.

Ejemplo:

OCR: REGAI H0LIDAY
Candidato: REGAL HOLIDAY
Similitud: 94 %

Reglas:

no corregir automáticamente por debajo del umbral;
conservar siempre el texto OCR original;
registrar el candidato;
registrar la puntuación;
permitir corrección manual;
no sobrescribir silenciosamente.
19. Confianza

La confianza debe calcularse por campo.

Considerar:

confianza del OCR
+
coincidencia con diccionario
+
validación de formato
+
consistencia posicional
+
reglas de dominio

Estados sugeridos:

AUTO_ACCEPTED
REVIEW_RECOMMENDED
REVIEW_REQUIRED
REJECTED
CORRECTED

Umbrales configurables:

AUTO_ACCEPT_THRESHOLD=0.95
REVIEW_THRESHOLD=0.80

No asumir que la confianza devuelta por el OCR es suficiente por sí sola.

20. Reglas de validación
Jornada
fecha válida;
mismo hipódromo;
carreras ordenadas;
números no duplicados;
horas coherentes.
Carrera
número entero;
distancia dentro de rango válido;
participantes no duplicados;
hora válida;
participantes referenciados en favoritos existentes.
Participante
número único;
nombre obligatorio;
peso dentro de rango configurable;
jinete opcional, pero trazable;
caballo no duplicado en la misma carrera.
Predicciones
no contener números inexistentes;
no contener duplicados;
preservar el orden;
guardar la fuente.
Traqueos
distancia numérica;
tiempo interpretable;
ejemplar asociado o marcado como pendiente.
21. Modelo de datos de staging

No importar directamente a las entidades definitivas.

Implementar una base intermedia.

Entidades mínimas:

DocumentIngestion
DocumentPage
DocumentRegion
OcrToken
ExtractedField
ExtractedMeeting
ExtractedRace
ExtractedEntry
ExtractedPrediction
ExtractedWorkout
ExtractionIssue
CorrectionAudit
ExportRecord

Campos importantes:

raw_value
normalized_value
confidence
status
page_number
region_type
bbox_x
bbox_y
bbox_width
bbox_height
ocr_engine
ocr_version
parser_version
corrected_by
corrected_at

Cada campo debe poder rastrearse hasta una región concreta del PDF.

22. Interfaz Gradio

Construir una interfaz clara, no un demo técnico.

Pestaña 1 — Cargar documento

Campos:

selector PDF;
publicación;
fecha de edición opcional;
hipódromo opcional;
observaciones;
botón “Procesar”.

Mostrar:

hash;
tamaño;
páginas;
estado;
progreso.
Pestaña 2 — Páginas

Tabla:

| Página | Tipo | Confianza | Estado |
|---|---|---|---|

Permitir abrir una página.

Pestaña 3 — Revisión de carrera

Diseño:

Imagen de página o región
+
formulario con datos extraídos

Permitir:

avanzar y retroceder;
seleccionar una carrera;
editar campos;
aceptar sugerencias;
rechazar;
guardar corrección.
Pestaña 4 — Incidencias

Filtros:

confianza baja;
campo obligatorio faltante;
participante no reconocido;
discrepancia;
error de formato.
Pestaña 5 — Exportación

Botones:

exportar JSON;
exportar CSV;
exportar ZIP;
descargar informe de incidencias.
23. Trazabilidad visual

Al seleccionar un campo en la interfaz debe poder verse:

página;
región original;
bounding box;
texto OCR;
valor normalizado;
confianza;
correcciones.

Idealmente, dibujar el bounding box sobre la imagen.

La trazabilidad es obligatoria para auditoría y revisión.

24. Persistencia inicial y relación con la base de Hípica 3×6

Esta herramienta **no escribe en las tablas de Hípica 3×6**, y conviene entender
por qué antes de decidir dónde vive su base.

Lo que produce el OCR es material en revisión: valores con confianza, recuadros
de origen, correcciones y incidencias. Ese ciclo de vida no es el de una jornada
publicada. Mezclarlos significaría que un dato sin revisar comparte tabla con uno
verificado, y que la regla de negocio de allá —una empresa, sus permisos, su
auditoría— tendría que convivir con la de aquí, que no tiene ninguna de las tres.

Hay además un problema mecánico: dos aplicaciones migrando el mismo esquema desde
repositorios distintos. Prisma lleva su control en `_prisma_migrations` y Alembic
el suyo en `alembic_version`; cada una cree ser dueña del esquema y la primera
migración cruzada rompe la otra.

**Recomendación: la misma instancia de PostgreSQL, un esquema propio.**

- En producción, el mismo servidor gestionado que ya usa Hípica 3×6, con la
  herramienta en su propio esquema (`ocr`, por ejemplo) y su propio usuario. Una
  sola base que pagar, ownership claro, cero colisión de migraciones.
- En desarrollo, SQLite mediante SQLAlchemy: no obliga a levantar PostgreSQL para
  probar un parser. La capa de repositorios hace que el cambio sea de
  configuración.
- **Lectura permitida**: los diccionarios de ejemplares, jinetes y entrenadores
  se siembran del catálogo canónico de Hípica 3×6, que es lo que hace útil la
  coincidencia aproximada. Con un usuario de solo lectura sobre ese esquema, o
  por API. Nunca con permiso de escritura.
- **Escritura, jamás directa**: lo extraído viaja por la vía de importación
  descrita en la sección 30, con su huella, su versión de parser y sus
  evidencias, para que sea Hípica 3×6 quien aplique sus reglas, sus permisos y su
  auditoría. Un `INSERT` desde fuera se saltaría las tres.

Implementar SQLite mediante SQLAlchemy.

Requisitos:

migraciones;
repositorios;
transacciones;
índices;
unicidad por hash;
historial de estados;
auditoría de correcciones.

No asumir que el disco del hosting gratuito será permanente.

La aplicación debe poder exportar y descargar los resultados antes de que el entorno se reinicie.

25. Almacenamiento de archivos

Crear ObjectStoragePort.

Implementación inicial:

LocalObjectStorage

Rutas:

data/uploads/
data/working/
data/exports/

Preparar adaptadores futuros para:

S3
Google Cloud Storage
Supabase Storage
Azure Blob Storage

No importar SDK cloud en los servicios de negocio.

26. Procesamiento asíncrono

Crear JobQueuePort.

Implementación inicial:

InlineJobQueue

o:

ThreadPoolJobQueue

solo para MVP.

Debe ser reemplazable posteriormente por:

Redis + RQ;
Celery;
AWS SQS;
Google Pub/Sub;
Cloud Tasks;
ECS Tasks;
Cloud Run Jobs.

No guardar estado exclusivamente en memoria.

27. CLI obligatoria

La herramienta debe funcionar sin interfaz.

Ejemplos:

python -m app.interfaces.cli process \
  --pdf data/uploads/gaceta.pdf \
  --template gaceta_hipica
python -m app.interfaces.cli export \
  --ingestion-id UUID \
  --format json

El paquete `app/interfaces/cli/` necesita un `__main__.py` para que
`python -m app.interfaces.cli` funcione; si no, el comando falla con
«No module named app.interfaces.cli.__main__».

Esto garantiza portabilidad y facilita GitHub Actions, Docker y procesamiento batch.

28. API futura

Preparar, sin necesidad de desarrollar una API completa en la primera fase, contratos para:

POST /documents
GET /documents/{id}
GET /documents/{id}/pages
GET /documents/{id}/issues
PATCH /documents/{id}/fields/{fieldId}
POST /documents/{id}/approve
POST /documents/{id}/export

La lógica debe estar en casos de uso reutilizables, no en Gradio.

29. Exportación
JSON

Diseñar un esquema versionado:

```json
{
  "schemaVersion": "1.0",
  "source": {
    "type": "GACETA_HIPICA",
    "sha256": "...",
    "parserVersion": "..."
  },
  "meeting": {},
  "races": [],
  "issues": [],
  "evidence": []
}
```
CSV

Generar al menos:

meetings.csv
races.csv
entries.csv
predictions.csv
workouts.csv
issues.csv
ZIP

Incluir:

result.json
CSVs
informe de incidencias
imágenes de regiones
manifiesto de hashes
29 bis. Segunda entrada: resultados de carrera desde una imagen

Además de la revista en PDF, la herramienta debe aceptar **una imagen suelta con
los resultados de una jornada** —una foto del cartel, una captura de pantalla, el
recorte que circula por mensajería— y extraer de ella el resultado de cada
carrera.

Es el mismo núcleo con otra puerta de entrada. Todo lo que sigue al renderizado
—preprocesamiento, detección de regiones, OCR por región, parsing, normalización,
confianza, revisión y exportación— se reutiliza tal cual. Lo que cambia:

**Origen.** `PdfRendererPort` deja de ser suficiente: el contrato pasa a ser un
`DocumentSourcePort` que entrega páginas como imágenes, venga cada una de un PDF
o de un archivo suelto (`PdfPageSource`, `ImageFileSource`). El resto del núcleo
no debe enterarse de la diferencia.

**Preprocesamiento.** Una foto trae problemas que un escaneo no tiene:
perspectiva marcada, iluminación desigual, sombras, dedos, rotación libre,
recortes parciales y compresión de mensajería. Hace falta corrección de
perspectiva por detección de bordes, normalización de iluminación por regiones y
un umbral de resolución mínima por debajo del cual se rechaza el archivo con un
motivo claro en vez de producir basura con apariencia de dato.

**Tipo de documento.** Se añade `RESULTS` a la clasificación, con sus anclas
propias —posiciones de llegada, dividendos, tiempos— y su plantilla en
`templates/`.

**Datos a extraer**, por carrera:

- número de carrera;
- orden de llegada con el número de cada ejemplar;
- nombre del ejemplar cuando se lea;
- tiempo, cuando aparezca;
- dividendos y modalidades, cuando aparezcan;
- carrera declarada nula o suspendida, si consta.

**Regla de dominio que no se puede saltar.** En Hípica 3×6 los ganadores
oficiales los publica el superadministrador y existe una conciliación entre lo
publicado y lo ingestado de proveedores. Un resultado leído de una foto es **una
propuesta más para esa conciliación**, nunca un ganador publicado: entra con su
fuente, su confianza, su evidencia visual y su recorte de origen, y si discrepa
de lo que ya hay, abre una incidencia de calidad en vez de sobrescribir. Una foto
sin autoría verificable no puede tener más autoridad que la fuente oficial.

**Validaciones propias:**

- posiciones sin repetir dentro de una carrera;
- todo ejemplar del resultado existe en el programa de esa jornada, si se conoce;
- número de carreras coherente con la jornada;
- un empate declarado se conserva como tal, no se resuelve inventando un orden.

30. Compatibilidad futura con Hípica 3×6

No acoplar esta herramienta al modelo interno de Hípica 3×6.

Crear un exportador o mapper separado:

Hipica3x6ExportAdapter

El núcleo debe producir un modelo neutral.

En el futuro podrá implementarse en Hípica 3×6 —**hoy no existe**, hay que
crearlo allí con su permiso y su auditoría—:

POST /api/racing/document-imports

El envío debe incluir:

datos;
fuente;
SHA-256;
fecha de observación;
versión del parser;
evidencias;
confianza;
incidencias;
correcciones.
31. Servicios gratuitos iniciales

Preparar despliegue inicial para:

Opción principal
Hugging Face Spaces + Gradio
Alternativa
Streamlit Community Cloud

No asumir almacenamiento persistente.

No almacenar credenciales en el repositorio.

Incluir instrucciones de despliegue para ambas opciones.

32. Docker

Docker es **una vía, no un requisito**. La aplicación debe poder instalarse y
ejecutarse con `pip install -r requirements.txt` y su comando de arranque en
cualquier máquina con Python, Tesseract y las bibliotecas de OpenCV disponibles.

Importa aquí más que en una aplicación Node porque Tesseract, sus datos de idioma
español y OpenCV son paquetes del sistema, no de Python. Pero los servicios
gratuitos previstos resuelven eso sin contenedor: tanto Hugging Face Spaces como
Streamlit Community Cloud instalan paquetes del sistema declarándolos en un
`packages.txt` (`tesseract-ocr`, `tesseract-ocr-spa`, `libgl1`). Ese es el camino
del MVP.

El Dockerfile se mantiene como entregable porque es lo que permite reproducir el
mismo entorno en un VPS, en un orquestador o en la máquina de otra persona, y
porque es la única vía si mañana hace falta una versión distinta de Tesseract.

Crear un Dockerfile funcional.

Debe instalar:

Tesseract;
idioma español;
dependencias de OpenCV;
fuentes o librerías necesarias;
Python;
dependencias del proyecto.

Ejemplo de ejecución:

docker build -t hipica-document-ocr .
docker run --rm \
  -p 7860:7860 \
  -v "$(pwd)/data:/app/data" \
  hipica-document-ocr

La misma imagen debe poder utilizarse posteriormente en:

Hugging Face Docker Spaces;
AWS ECS;
Google Cloud Run;
Azure Container Apps;
Railway;
Render;
VPS.
33. GitHub Actions

Crear workflows separados.

Calidad

En cada pull request:

ruff
format check
mypy/pyright
pytest
security scan
docker build
Publicación

Preparar workflow manual o documentado para publicar en Hugging Face Spaces.

Procesamiento batch

Crear workflow manual opcional:

workflow_dispatch

que permita procesar un PDF de prueba y generar artefactos.

No colocar PDFs privados o credenciales dentro del repositorio.

34. Pruebas

Implementar pruebas unitarias para:

normalización de fechas;
ordinales;
distancias;
premios;
favoritos;
ratings;
fuzzy matching;
validaciones;
cálculo de confianza;
hashes;
detección de duplicados.

Implementar pruebas de integración para:

PDF de pocas páginas;
página de carrera;
publicidad;
extracción de cabecera;
exportación JSON;
persistencia;
correcciones.

Utilizar golden files:

imagen de entrada
resultado esperado

Las pruebas leen de `tests/fixtures/` y `tests/golden_files/`, **nunca de
`data/`**: ese directorio es material de trabajo de la aplicación y su contenido
cambia entre ejecuciones. Un fixture demasiado pesado para versionar se declara
por nombre y la prueba se omite cuando no está, en vez de fallar.

No hacer que todas las pruebas dependan de ejecutar OCR completo.

Separar:

pruebas rápidas
pruebas OCR
pruebas end-to-end
35. Métricas de precisión

Registrar métricas:

precision por campo
recall por campo
campos corregidos
campos autoaceptados
páginas procesadas
duración por página
errores por motor

Crear un comando:

python -m app.interfaces.cli evaluate \
  --dataset tests/golden_files

El informe debe mostrar, al menos:

| Campo | Exactitud |
|---|---|
| Fecha | … |
| Número de carrera | … |
| Distancia | … |
| Nombre de ejemplar | … |
| Favoritos | … |
| Rating | … |
36. Rendimiento

Procesar una página a la vez.

No conservar matrices innecesarias.

Liberar recursos explícitamente.

Incluir logs de:

inicio y fin;
duración;
memoria aproximada;
página;
motor;
incidencias.

Permitir configurar:

PDF_RENDER_DPI=300
MAX_WORKERS=1
OCR_TIMEOUT_SECONDS=120
KEEP_INTERMEDIATE_IMAGES=false
```

Las imágenes intermedias se conservan en desarrollo —son la evidencia visual de
la trazabilidad— y se apagan donde el disco es efímero o escaso. El valor por
defecto del `.env.example` es `true` por eso mismo; en despliegue gratuito se
pone a `false`.

```text

En servicios gratuitos usar inicialmente:

MAX_WORKERS=1
37. Seguridad

Implementar:

validación MIME;
extensión;
tamaño máximo;
nombre seguro;
directorios aislados por UUID;
protección contra path traversal;
eliminación de archivos temporales;
no ejecutar contenido del PDF;
no exponer rutas internas;
no registrar información sensible;
límites de recursos.

No asumir que un PDF subido es confiable.

38. Observabilidad

Usar logging estructurado.

Campos:

ingestion_id
page_number
stage
duration_ms
status
error_type
ocr_engine
parser_version

No usar únicamente print.

Preparar una interfaz de observabilidad reemplazable posteriormente por:

CloudWatch;
Google Cloud Logging;
Datadog;
OpenTelemetry.
39. Configuración

Centralizar configuración mediante Pydantic Settings.

Archivo .env.example:

APP_ENV=development
DATA_DIR=./data
DATABASE_URL=sqlite:///./data/app.db

OCR_ENGINE=tesseract
OCR_FALLBACK_ENGINE=
OCR_LANGUAGE=spa

PDF_RENDER_DPI=300
MAX_PDF_SIZE_MB=50
MAX_PDF_PAGES=30
MAX_WORKERS=1

AUTO_ACCEPT_THRESHOLD=0.95
REVIEW_THRESHOLD=0.80

KEEP_INTERMEDIATE_IMAGES=true
LOG_LEVEL=INFO

No dispersar lecturas directas de variables por todo el código.

40. Documentación

Crear:

README.md
docs/ARCHITECTURE.md
docs/OCR_PIPELINE.md
docs/TEMPLATE_SYSTEM.md
docs/DATA_MODEL.md
docs/DEPLOYMENT_FREE_TIER.md
docs/DEPLOYMENT_AWS.md
docs/DEPLOYMENT_GCP.md
docs/INTEGRATION_HIPICA3X6.md
docs/SECURITY.md
docs/TESTING.md

Documentar:

instalación;
ejecución local;
Docker;
Gradio;
Hugging Face;
Streamlit;
cómo añadir otra revista;
cómo crear una plantilla;
cómo revisar errores;
cómo exportar;
cómo migrar a PostgreSQL;
cómo cambiar de almacenamiento;
cómo cambiar de cola;
limitaciones conocidas.
41. Fases de implementación
Fase 1 — Núcleo y carga
estructura;
configuración;
carga;
hash;
almacenamiento;
renderizado;
CLI;
Gradio básico.
Fase 2 — Clasificación y cabecera
tipos de página;
anclas;
fecha;
hipódromo;
carrera;
hora;
distancia;
premios.
Fase 3 — Pronósticos
favoritos;
rating;
válidas;
pools.
Fase 4 — Participantes
detección de filas;
número;
nombre;
jinete;
peso;
entrenador;
fuzzy matching.
Fase 5 — Revisión
bounding boxes;
edición;
incidencias;
auditoría;
estados.
Fase 6 — Traqueos
detección;
ejemplar;
distancia;
tiempo;
observaciones.
Fase 7 — Resultados desde imagen
origen de imagen suelta;
corrección de perspectiva e iluminación;
clasificación RESULTS;
orden de llegada;
validaciones;
propuesta para la conciliación.
Fase 8 — Exportación y despliegue
JSON;
CSV;
ZIP;
Docker;
Hugging Face;
Streamlit;
documentación cloud.

No intentar completar todas las fases simultáneamente sin estabilizar las anteriores.

42. Entregables

Entregar:

código completo;
interfaz Gradio funcional;
CLI funcional;
pipeline OCR;
sistema de plantillas;
SQLite;
exportadores;
pruebas;
Dockerfile;
docker-compose;
workflows;
documentación;
ejemplo de procesamiento;
informe de precisión;
lista de limitaciones;
lista de archivos modificados;
decisiones arquitectónicas;
riesgos detectados.
43. Criterios de aceptación

El proyecto se considerará aceptable cuando:

ruff check .

pase correctamente.

pytest

pase correctamente.

mypy app

o el verificador equivalente pase sin errores críticos.

docker build -t hipica-document-ocr .

termine correctamente **si se opta por el camino con contenedor**; con el camino
de `packages.txt` basta con que la instalación por `pip` y el arranque funcionen
en un entorno limpio.

La aplicación debe iniciar con:

python -m app.interfaces.gradio.main

Debe poder:

cargar un PDF;
cargar una imagen de resultados y extraer el orden de llegada de al menos una
carrera;
calcular su hash;
renderizar sus páginas;
clasificarlas;
extraer al menos cabecera, favoritos y rating;
mostrar resultados;
corregir campos;
guardar correcciones;
exportar JSON y CSV;
ejecutarse sin un LLM.
44. Requisitos de portabilidad

El resultado no puede depender estructuralmente del hosting gratuito.

La migración futura debe consistir principalmente en sustituir adaptadores:

SQLite → PostgreSQL
Local Storage → S3/GCS
Inline Queue → SQS/PubSub/Redis
Gradio → FastAPI + React
Hugging Face → ECS/Cloud Run

No debe ser necesario reescribir:

parsers;
reglas;
modelos de dominio;
OCR;
normalizadores;
validadores;
exportadores neutrales;
pruebas.
45. Forma de trabajo

Antes de modificar el código:

inspecciona el repositorio;
documenta la arquitectura encontrada;
identifica dependencias;
propone el plan por fases;
identifica riesgos;
valida que el plan no introduzca acoplamiento cloud.

Después:

implementa por fases;
ejecuta pruebas tras cada fase;
documenta cambios;
no elimines funcionalidad útil;
no ocultes errores;
no declares éxito sin ejecutar validaciones.

Al finalizar, presentar un informe con:

| Cambio | Motivo | Estado | Riesgo | Portabilidad |
|---|---|---|---|---|

También incluir:

comandos ejecutados;
pruebas realizadas;
resultados;
limitaciones;
trabajo pendiente;
instrucciones de despliegue gratuito.
Resultado esperado

El resultado debe ser una herramienta independiente denominada, por ejemplo:

Hipica Document OCR

capaz de procesar revistas hípicas escaneadas, producir datos estructurados y permitir una revisión humana trazable.

Inicialmente se desplegará sin coste en:

Gradio + Hugging Face Spaces

o, de forma alternativa:

Streamlit Community Cloud

Pero su arquitectura debe estar preparada para migrar posteriormente a:

AWS
GCP
Azure
Docker
VPS
Kubernetes

sin desmontar ni reescribir el núcleo de procesamiento documental.