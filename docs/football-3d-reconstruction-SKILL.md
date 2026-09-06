# Skill: Football 3D Reconstruction from Broadcast Video

## Name

`football-3d-reconstruction`

## Purpose

Diseñar, implementar, evaluar y mejorar pipelines de computer vision para reconstrucción 3D de jugadas de fútbol a partir de vídeo broadcast 2D.

La skill está orientada a proyectos de análisis futbolístico que necesiten combinar detección, tracking, calibración del terreno, estimación de coordenadas métricas, reconstrucción corporal 3D, seguimiento del balón y visualización/replay 3D.

No debe asumir que una reconstrucción visualmente convincente es métricamente precisa. Toda conclusión geométrica, biomecánica o arbitral debe ir acompañada de métricas de error y validación.

---

## When to use

Usar esta skill cuando el usuario o el proyecto solicite cualquiera de estas tareas:

- reconstruir una jugada de fútbol en 3D desde vídeo;
- obtener posición métrica de jugadores desde vídeo broadcast;
- estimar pose corporal 3D;
- integrar SAM 3D Body;
- mejorar tracking de jugadores;
- resolver oclusiones;
- estimar orientación corporal;
- generar un replay 3D;
- construir un digital twin de una jugada;
- analizar fuera de juego experimentalmente;
- estimar trayectorias del balón;
- estudiar consistencia temporal de poses;
- evaluar precisión de un pipeline de computer vision futbolístico.

---

## Primary goals

1. Detectar jugadores, árbitros y balón.
2. Mantener identidades consistentes a lo largo del tiempo.
3. Detectar líneas, puntos y geometría del terreno.
4. Calibrar la cámara.
5. Convertir coordenadas de imagen a coordenadas métricas del campo.
6. Reconstruir pose y mesh 3D de jugadores.
7. Suavizar resultados temporalmente.
8. Estimar posición y trayectoria del balón.
9. Crear una representación estructurada del estado de la jugada.
10. Permitir visualización 2D/3D y generación de métricas.
11. Medir explícitamente el error del sistema.

---

# Architectural principles

## 1. Pipeline modular

No implementar un script monolítico.

Separar como mínimo:

```text
video-ingestion
player-detection
player-tracking
team-classification
pitch-detection
camera-calibration
world-projection
pose-estimation
body-reconstruction
ball-detection
ball-tracking
temporal-smoothing
scene-reconstruction
analytics
visualization
evaluation
```

Cada módulo debe poder probarse individualmente.

---

## 2. Coordinates

Mantener explícitamente tres sistemas de coordenadas:

```text
IMAGE SPACE
(u, v)

PITCH SPACE
(x, y)

WORLD SPACE
(x, y, z)
```

Nunca mezclar coordenadas sin indicar su referencia.

Convención recomendada:

- origen del campo: esquina inferior izquierda;
- eje X: longitud del campo;
- eje Y: anchura;
- eje Z: altura;
- unidades métricas: metros.

Guardar dimensiones reales del terreno utilizadas en la calibración.

---

## 3. Detection

Priorizar detectores modernos y sustituibles.

Opciones válidas:

- RF-DETR;
- YOLO;
- RT-DETR;
- modelos específicos del proyecto.

Clases mínimas:

```text
player
goalkeeper
referee
ball
```

Toda detección debería exponer:

```json
{
  "frame": 120,
  "class": "player",
  "confidence": 0.94,
  "bbox": [x1, y1, x2, y2]
}
```

No depender exclusivamente del centro del bounding box para proyectar jugadores al terreno.

Para jugadores, priorizar:

- punto de contacto con el suelo;
- tobillos/pies;
- pose 2D;
- máscara de segmentación.

---

## 4. Tracking

El tracker debe mantener IDs estables.

Opciones:

- ByteTrack;
- BoT-SORT;
- StrongSORT;
- OC-SORT;
- tracker personalizado.

Evaluar:

- ID switches;
- fragmentación;
- pérdida de tracks;
- recuperación tras oclusión;
- estabilidad en cortes de cámara.

No reutilizar automáticamente IDs después de cambios de plano.

---

## 5. Team classification

El equipo puede inferirse mediante:

- color dominante de camiseta;
- embeddings visuales;
- clustering;
- clasificación supervisada.

Evitar clasificar equipos usando únicamente el color de un único frame.

Agregar suavizado temporal por track.

---

# Pitch detection and camera calibration

## Required outputs

El módulo de calibración debe producir:

```text
camera parameters
homography
projection matrix cuando sea posible
confidence score
visible pitch landmarks
```

Usar:

- líneas del terreno;
- intersecciones;
- círculo central;
- áreas;
- puntos de penalti;
- porterías;
- keypoints del campo.

La homografía es válida principalmente para puntos sobre el plano del terreno.

No usarla directamente para estimar correctamente objetos elevados como un balón en vuelo.

---

## Projection

Para jugadores:

```text
image foot point
      ↓
homography
      ↓
pitch coordinate (x, y)
```

Registrar incertidumbre cuando:

- los pies están ocultos;
- el jugador está parcialmente fuera del frame;
- la cámara está en transición;
- la calibración tiene baja confianza.

---

# SAM 3D Body integration

## Purpose

Usar SAM 3D Body o un modelo equivalente para estimar:

- pose corporal;
- articulaciones;
- orientación;
- mesh 3D;
- parámetros del cuerpo.

SAM 3D Body debe tratarse como componente de reconstrucción corporal, no como solución completa de reconstrucción de partidos.

---

## Recommended inputs

Cuando estén disponibles, utilizar además:

- bounding box;
- máscara;
- keypoints 2D;
- track ID.

Entrada conceptual:

```json
{
  "frame": 320,
  "track_id": 7,
  "bbox": [],
  "mask": "...",
  "keypoints_2d": []
}
```

Salida:

```json
{
  "track_id": 7,
  "pose_3d": [],
  "mesh_vertices": [],
  "joints_3d": [],
  "orientation": {},
  "confidence": 0.0
}
```

---

# Temporal consistency

Nunca considerar suficientes las poses obtenidas frame a frame.

Aplicar una fase temporal.

Opciones:

- moving average;
- Savitzky-Golay;
- Kalman filter;
- One Euro Filter;
- spline interpolation;
- temporal neural model.

Suavizar:

- posición;
- orientación;
- joints;
- parámetros del mesh.

No suavizar de forma que elimine cambios de dirección reales.

---

# Occlusions

Las oclusiones son un caso crítico.

Detectar explícitamente:

```text
visible
partially_occluded
heavily_occluded
not_visible
```

Durante oclusión:

1. mantener predicción del tracker;
2. conservar identidad;
3. reducir confianza;
4. evitar generar métricas biomecánicas fuertes;
5. interpolar únicamente dentro de ventanas temporales razonables.

Un córner debe utilizarse como uno de los escenarios de stress testing.

---

# Ball tracking

El balón requiere pipeline propio.

## Ground ball

Cuando el balón está sobre el terreno:

```text
ball image position
        ↓
homography
        ↓
(x, y)
```

## Airborne ball

Para balón aéreo, una única cámara broadcast no permite recuperar Z con precisión de forma trivial.

Opciones:

- trayectoria física;
- priors balísticos;
- tamaño aparente;
- estimación monocular de profundidad;
- detección del momento de golpeo;
- optimización temporal;
- múltiples cámaras cuando existan.

Toda estimación de Z debe incluir incertidumbre.

---

# Match state model

Generar un estado estructurado por frame:

```json
{
  "frame": 1000,
  "timestamp": 40.0,
  "camera": {},
  "players": [
    {
      "track_id": 7,
      "team": "home",
      "pitch_position": [34.2, 18.7],
      "orientation": 1.43,
      "pose_3d": {},
      "confidence": 0.91
    }
  ],
  "ball": {
    "position": [36.8, 20.1, 0.12],
    "confidence": 0.83
  }
}
```

Este formato debe desacoplar análisis y visualización.

---

# Possible analytics

Una vez validada la reconstrucción se pueden calcular:

- orientación corporal;
- ángulo de recepción;
- perfil corporal;
- dirección de carrera;
- cambios de orientación;
- líneas defensivas;
- anchura y profundidad;
- distancias entre jugadores;
- compactación;
- ángulos de pase;
- espacio disponible;
- postura previa al golpeo;
- aproximación al balón;
- foot contact aproximado;
- pose durante sprint;
- interacción jugador-jugador.

No usar resultados de pose 3D como biomarcadores clínicos o biomecánicos sin validación adicional.

---

# Experimental offside analysis

Puede desarrollarse una funcionalidad experimental de fuera de juego.

Pipeline:

```text
camera calibration
      ↓
player 3D reconstruction
      ↓
body-part coordinates
      ↓
second-last defender
      ↓
offside plane
      ↓
attacker valid body parts
```

Reglas:

- tratarlo como herramienta experimental;
- mostrar margen de error;
- nunca afirmar precisión VAR sin validación;
- considerar sincronización exacta con el instante del pase;
- diferenciar partes válidas del cuerpo según reglamento.

---

# 3D visualization

Opciones:

- Three.js;
- Blender;
- Open3D;
- PyVista;
- Unity;
- Unreal Engine.

Para aplicaciones web, preferir Three.js.

El renderer debe consumir el `match state`, no leer directamente resultados internos de inferencia.

Separar:

```text
analytics engine
        ↓
match state
        ↓
renderer
```

---

# Evaluation

No aceptar demos únicamente visuales.

Medir como mínimo:

## Detection

- precision;
- recall;
- mAP.

## Tracking

- HOTA;
- IDF1;
- MOTA;
- ID switches.

## Pitch calibration

- reprojection error;
- landmark error;
- positional error in meters.

## Player localization

- MAE en metros;
- error percentiles P50/P90/P95.

## Pose

- MPJPE si existe ground truth;
- jitter temporal;
- continuidad articular.

## Ball

- detection recall;
- tracking continuity;
- positional error.

---

# Minimum proof of concept

Antes de procesar partidos completos, utilizar una jugada de 5–10 segundos.

Objetivo inicial:

```text
1 camera shot
4–8 players
1 ball
stable camera calibration
stable tracking
3D body reconstruction
basic 3D replay
```

Validar:

1. error espacial;
2. estabilidad de IDs;
3. estabilidad temporal;
4. latencia;
5. uso de GPU;
6. calidad visual.

Solo escalar después de obtener métricas aceptables.

---

# Recommended development phases

## Phase 1 — 2D foundation

- video ingestion;
- player detection;
- ball detection;
- tracking;
- team classification;
- pitch detection;
- homography;
- 2D tactical map.

## Phase 2 — 3D players

- pose estimation;
- SAM 3D Body;
- player orientation;
- temporal smoothing;
- 3D player placement.

## Phase 3 — Scene reconstruction

- 3D pitch;
- meshes;
- camera reconstruction;
- interactive replay.

## Phase 4 — Ball 3D

- airborne ball estimation;
- physics constraints;
- trajectory reconstruction.

## Phase 5 — Analytics

- body orientation;
- tactical metrics;
- receiving angles;
- pose-derived events.

## Phase 6 — Advanced research

- occlusion recovery;
- multi-camera fusion;
- offside experiments;
- interaction modeling;
- real-time inference.

---

# Performance rules

1. No ejecutar SAM 3D Body sobre todos los jugadores de todos los frames sin necesidad.
2. Permitir frame sampling configurable.
3. Reutilizar tracks.
4. Cachear inferencias.
5. Procesar crops por jugador.
6. Permitir batch inference.
7. Medir VRAM.
8. Separar procesamiento offline y realtime.

Configuración sugerida:

```yaml
video:
  fps_processing: 12

detection:
  confidence: 0.4

tracking:
  max_lost_frames: 30

pose:
  enabled: true
  sample_every_n_frames: 2

sam3d:
  enabled: true
  batch_size: 8

temporal:
  smoothing: true

evaluation:
  enabled: true
```

---

# Storage

Evitar almacenar meshes completos redundantes por cada frame si no son necesarios.

Separar:

```text
raw detections
tracks
pitch calibration
pose parameters
mesh parameters
analytics
render cache
```

Preferir formatos:

- Parquet para datos tabulares;
- JSON/JSONL para metadatos pequeños;
- NumPy/Zarr para arrays;
- object storage para vídeos y artefactos pesados.

---

# Security and legal considerations

- No almacenar vídeos con derechos sin autorización.
- Registrar procedencia del vídeo.
- Separar datasets de entrenamiento de material de análisis.
- Revisar licencias de modelos y checkpoints antes de uso comercial.
- No asumir que código open source implica que pesos/datasets permitan cualquier uso.
- Documentar versiones exactas de modelos.

---

# Agent behavior

Cuando esta skill esté activa, el agente debe:

1. inspeccionar primero el pipeline existente;
2. identificar módulos reutilizables;
3. evitar reescrituras innecesarias;
4. proponer cambios incrementales;
5. crear tests por módulo;
6. medir calidad además de mostrar visualizaciones;
7. señalar cualquier supuesto geométrico;
8. registrar incertidumbre;
9. priorizar reproducibilidad;
10. mantener configuraciones versionadas.

---

# Output expected from implementation tasks

Ante una petición de implementación, entregar:

1. análisis del estado actual;
2. plan;
3. archivos a modificar;
4. implementación;
5. tests;
6. métricas;
7. limitaciones;
8. riesgos;
9. próximos pasos.

Para hallazgos técnicos utilizar:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

y categorías:

```text
BUG
PERFORMANCE
ARCHITECTURE
COMPUTER_VISION
TRACKING
CALIBRATION
3D_RECONSTRUCTION
DATA
SECURITY
RESEARCH_GAP
```

---

# Definition of done

Una feature no se considera terminada porque genere una visualización.

Debe cumplir:

- funciona;
- tiene tests;
- no rompe módulos existentes;
- registra configuración;
- produce métricas;
- documenta supuestos;
- documenta limitaciones;
- puede reproducirse;
- tiene salida estructurada;
- puede evaluarse contra ground truth cuando exista.

---

# Core principle

**Primero precisión y reproducibilidad; después espectacularidad visual.**

Una reconstrucción 3D bonita pero geométricamente incorrecta no debe utilizarse para derivar conclusiones tácticas, biomecánicas o arbitrales.
