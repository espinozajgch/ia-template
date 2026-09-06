# Skill: Football Tactical Video Analysis

## Name

`football-tactical-video-analysis`

## Purpose

Diseñar, implementar, evaluar y mejorar pipelines de computer vision y analytics para analizar partidos de fútbol desde vídeo, detectando jugadores, equipos, balón, estructura táctica, distancias, ocupación espacial, convex hulls, líneas, bloques, formaciones, patrones recurrentes y comportamientos colectivos.

La skill está pensada para proyectos de análisis táctico automatizado que necesiten convertir vídeo broadcast, cámaras tácticas o vídeo fijo en datos estructurados y métricas interpretables.

El objetivo no es solo detectar objetos: es reconstruir el estado espacial del partido y extraer comportamiento táctico reproducible y medible.

---

## When to use

Usar esta skill cuando el proyecto solicite cualquiera de estas tareas:

- detectar jugadores en vídeo de fútbol;
- mantener tracking individual;
- identificar equipos;
- proyectar jugadores a coordenadas del campo;
- medir distancias entre jugadores;
- medir distancia entre líneas;
- calcular anchura y profundidad;
- calcular convex hull;
- detectar compactación;
- identificar líneas defensivas;
- detectar bloques bajo, medio o alto;
- reconocer formaciones;
- detectar cambios de esquema;
- detectar presión, repliegue o basculación;
- analizar ocupación de espacios;
- identificar patrones ofensivos o defensivos;
- detectar superioridades;
- analizar alturas de presión;
- detectar estructura en posesión y fuera de posesión;
- generar mapas tácticos;
- construir secuencias y patrones temporales;
- descubrir patrones automáticamente mediante clustering o sequence mining;
- analizar partidos completos de forma offline.

---

# Core principle

**El vídeo debe convertirse primero en una representación espacial fiable del partido. Las conclusiones tácticas vienen después.**

Nunca calcular métricas tácticas directamente sobre píxeles si pueden proyectarse a coordenadas métricas del terreno.

---

# High-level architecture

```text
VIDEO
  ↓
INGESTION
  ↓
SHOT / CAMERA ANALYSIS
  ↓
PLAYER + BALL DETECTION
  ↓
TRACKING
  ↓
TEAM CLASSIFICATION
  ↓
PITCH DETECTION
  ↓
CAMERA CALIBRATION
  ↓
WORLD / PITCH COORDINATES
  ↓
MATCH STATE
  ↓
SPATIAL ANALYTICS
  ↓
TACTICAL STRUCTURE
  ↓
TEMPORAL PATTERNS
  ↓
VISUALIZATION / REPORTING
```

---

# Recommended modules

Organizar el proyecto como mínimo en:

```text
video_ingestion
shot_detection
player_detection
ball_detection
tracking
team_classification
pitch_detection
camera_calibration
coordinate_projection
match_state
spatial_metrics
team_shape
line_detection
formation_detection
pressure_analysis
possession_analysis
pattern_detection
sequence_analysis
visualization
evaluation
```

No construir un único script monolítico.

---

# Technology stack

## Core language

Preferir:

- Python 3.11+
- NumPy
- pandas
- SciPy
- scikit-learn
- OpenCV

Opcionales según necesidades:

- PyTorch
- torchvision
- Ultralytics
- Hugging Face Transformers
- Supervision
- Polars
- CuPy
- Numba
- PyArrow
- Shapely
- GeoPandas
- NetworkX

---

# Detection

## Recommended detectors

Opciones válidas:

- RF-DETR
- YOLO11 / YOLOv8
- RT-DETR
- DETR variants
- Grounding DINO para pipelines experimentales
- modelos entrenados específicamente sobre fútbol

Clases mínimas:

```text
player
goalkeeper
referee
ball
```

Opcionales:

```text
coach
staff
substitute
assistant_referee
```

## Detection output

Cada detección debería exponer:

```json
{
  "frame": 100,
  "timestamp": 4.0,
  "class": "player",
  "confidence": 0.96,
  "bbox": [x1, y1, x2, y2]
}
```

---

# Player localization

No usar exclusivamente el centro del bounding box.

Para proyectar jugadores al campo, preferir:

1. punto medio entre ambos pies;
2. keypoints de tobillos;
3. punto inferior central del bounding box;
4. máscara de segmentación para detectar contacto con terreno.

Orden recomendado:

```text
pose feet
> segmentation foot-contact
> bbox bottom-center
> bbox center
```

---

# Tracking

## Recommended trackers

- ByteTrack
- BoT-SORT
- OC-SORT
- StrongSORT
- DeepSORT
- Hybrid tracking con appearance embeddings

## Tracking metrics

Medir:

- HOTA
- IDF1
- MOTA
- ID switches
- track fragmentation
- recovery after occlusion

## Re-identification

Para partidos largos y cortes de cámara, considerar:

- OSNet
- CLIP embeddings
- DINOv2 embeddings
- custom jersey embeddings

Usar embeddings junto con:

- número de dorsal;
- equipo;
- color de camiseta;
- posición aproximada;
- continuidad temporal.

---

# Team classification

## Techniques

1. Recortar torso del jugador.
2. Extraer color dominante.
3. Convertir a HSV o LAB.
4. Aplicar clustering.

Opciones:

- KMeans
- Gaussian Mixture Models
- DBSCAN

Mejorar con:

- embeddings visuales;
- clasificación supervisada;
- temporal smoothing;
- identificación específica de porteros.

Evitar clasificar por un solo frame.

---

# Pitch detection

## Techniques

Detectar:

- líneas laterales;
- línea de mitad;
- áreas;
- círculo central;
- puntos de penalti;
- esquinas;
- porterías.

Tecnologías:

- OpenCV Hough Transform
- semantic segmentation
- keypoint detection
- line segmentation
- custom pitch landmark networks

---

# Camera calibration

Objetivo:

```text
image coordinates
      ↓
homography / calibration
      ↓
pitch coordinates
```

Utilizar:

- homography;
- camera pose estimation;
- PnP cuando corresponda;
- line correspondences;
- landmark correspondences.

Guardar:

```json
{
  "frame": 100,
  "homography": [],
  "reprojection_error": 0.8,
  "confidence": 0.92
}
```

No usar frames con calibración de baja confianza para métricas críticas.

---

# Pitch coordinate system

Convención recomendada:

```text
X = longitud del campo
Y = anchura
```

Por ejemplo:

```text
0 <= X <= 105
0 <= Y <= 68
```

Permitir dimensiones configurables.

Normalizar opcionalmente:

```text
x_norm = x / pitch_length
y_norm = y / pitch_width
```

---

# Match state model

Por cada frame o timestep:

```json
{
  "timestamp": 135.4,
  "frame": 3385,
  "players": [
    {
      "track_id": 7,
      "team": "home",
      "x": 52.3,
      "y": 34.1,
      "velocity": 4.2,
      "direction": 1.5,
      "confidence": 0.93
    }
  ],
  "ball": {
    "x": 54.0,
    "y": 33.3,
    "confidence": 0.81
  },
  "possession_team": "home"
}
```

Este estado debe ser la base de todas las métricas tácticas.

---

# Spatial metrics

## Pairwise distances

Calcular matriz de distancias:

```text
D[i,j] = ||player_i - player_j||
```

Implementación:

```python
from scipy.spatial.distance import cdist
```

Usos:

- distancia entre compañeros;
- distancia al rival más cercano;
- compactación;
- spacing;
- superioridades;
- presión.

---

# Distance between lines

## Objective

Medir separación entre:

- defensa y mediocampo;
- mediocampo y ataque;
- primera y segunda línea de presión;
- líneas del bloque defensivo.

## Technique

1. identificar líneas;
2. calcular centroide longitudinal de cada línea;
3. medir separación sobre eje X;
4. suavizar temporalmente.

Ejemplo:

```text
defensive_line_x = mean(x_defenders)
midfield_line_x = mean(x_midfielders)

distance = abs(defensive_line_x - midfield_line_x)
```

Para mayor robustez:

- medianas;
- trimmed mean;
- clustering 1D;
- DBSCAN;
- Gaussian Mixtures.

---

# Automatic line detection

## Input

Coordenadas de un equipo:

```text
(x1,y1)...(xn,yn)
```

## Techniques

### 1D clustering over depth

Clusterizar eje X:

- KMeans
- GMM
- DBSCAN
- hierarchical clustering

Resultado:

```text
line 1: defenders
line 2: midfield
line 3: attackers
```

### Dynamic number of lines

No fijar siempre 3 líneas.

Permitir:

```text
2
3
4
5
```

líneas según estructura observada.

Seleccionar número de clusters con:

- silhouette score;
- BIC;
- AIC.

---

# Width and depth

## Team width

```text
width = max(y) - min(y)
```

## Team depth

```text
depth = max(x) - min(x)
```

Calcular:

- total;
- por línea;
- en posesión;
- fuera de posesión;
- por tercio de campo.

---

# Convex hull

## Purpose

Representar el espacio ocupado por un equipo.

Tecnologías:

- `scipy.spatial.ConvexHull`
- `shapely.geometry.MultiPoint`

Ejemplo:

```python
from scipy.spatial import ConvexHull
hull = ConvexHull(points)
```

Métricas:

- área;
- perímetro;
- centroid;
- compactness ratio;
- orientation.

## Team compactness

```text
compactness = hull_area / number_of_players
```

o comparar contra:

```text
bounding_box_area
```

También calcular hull de:

- 10 jugadores de campo;
- bloque defensivo;
- línea defensiva;
- unidad de presión.

---

# Inter-team hull analysis

Calcular:

- solapamiento de hulls;
- separación entre hulls;
- centroid distance;
- occupied-space dominance.

Tecnologías:

- Shapely
- polygon intersection
- polygon distance

---

# Centroid

Para cada equipo:

```text
centroid_x = mean(x)
centroid_y = mean(y)
```

Usos:

- altura media;
- desplazamiento lateral;
- basculación;
- presión;
- repliegue;
- sincronización colectiva.

---

# Team block classification

Detectar:

```text
high block
mid block
low block
```

Variables:

- centroid_x;
- defensive_line_x;
- attacking_line_x;
- possession;
- ball_x;
- pitch thirds.

Ejemplo conceptual:

```text
high block:
centroid muy alto
defensive line alta
rival en campo propio

low block:
centroid bajo
defensive line cerca del área
```

Debe calibrarse según orientación de ataque.

---

# Pressing height

Calcular:

```text
team centroid
first defensive action location
distance to opponent goal
```

Variables útiles:

- altura de primera línea;
- número de jugadores en campo rival;
- distancia al poseedor;
- densidad alrededor del balón.

---

# Pressure detection

## Basic heuristic

Jugador presionado cuando:

```text
distance_to_nearest_opponent < threshold
```

Usar umbral contextual:

```text
1.5m
2m
3m
```

Mejorar con:

- closing speed;
- orientation;
- number of opponents;
- ball control;
- passing options.

---

# Local density

Usar vecinos dentro de radio:

```text
r = 5m
r = 8m
r = 10m
```

Tecnologías:

- KDTree
- BallTree
- scipy.spatial.cKDTree

Métrica:

```text
players_within_radius
```

Usos:

- presión;
- zonas sobrecargadas;
- superioridades;
- compactación local.

---

# Numerical superiority

Calcular superioridad en:

- círculos;
- rectángulos;
- zonas dinámicas;
- Voronoi regions.

Ejemplo:

```text
home = players_home_in_zone
away = players_away_in_zone
superiority = home - away
```

---

# Voronoi analysis

Tecnologías:

- scipy.spatial.Voronoi
- shapely
- mplsoccer

Usos:

- control espacial;
- espacio dominante;
- presión;
- ocupación;
- passing lanes.

Recortar siempre el Voronoi al polígono del campo.

---

# Formation detection

## Goal

Detectar esquemas como:

```text
4-4-2
4-3-3
4-2-3-1
3-5-2
3-4-3
5-4-1
```

## Recommended method

1. excluir portero;
2. normalizar dirección de ataque;
3. agrupar jugadores por profundidad X;
4. ordenar líneas;
5. contar jugadores por línea;
6. suavizar en ventana temporal.

Ejemplo:

```text
1 GK
4 defenders
3 midfielders
3 attackers
→ 4-3-3
```

No clasificar formación frame a frame.

Usar ventana:

```text
5–20 segundos
```

y mayoría temporal.

---

# Dynamic formation

Registrar cambios:

```text
4-3-3
  ↓
3-2-5 in possession
  ↓
4-4-2 out of possession
```

Distinguir:

```text
nominal formation
in-possession structure
out-of-possession structure
```

---

# Pattern detection

## Objective

Detectar patrones recurrentes de comportamiento.

Ejemplos:

- salida 3+2;
- lateral invertido;
- extremos abiertos;
- overload de banda;
- cambio de orientación;
- presión alta;
- pressing trap;
- bloque medio;
- bloque bajo;
- basculación;
- tercer hombre;
- underlap;
- overlap;
- rest defense;
- transición ofensiva;
- transición defensiva.

---

# Feature engineering for patterns

Crear vectores temporales con:

```text
team centroid
width
depth
hull area
line distances
ball position
ball velocity
player density
possession
pressure
number of players per zone
```

Ejemplo:

```json
{
  "centroid_x": 58.4,
  "width": 47.1,
  "depth": 31.5,
  "hull_area": 810.2,
  "def_mid_distance": 10.1,
  "mid_att_distance": 11.3,
  "ball_x": 62.0,
  "ball_y": 15.2
}
```

---

# Pattern discovery

## Unsupervised techniques

- KMeans
- DBSCAN
- HDBSCAN
- Gaussian Mixtures
- Spectral Clustering

## Dimensionality reduction

- PCA
- UMAP
- t-SNE para exploración, no para producción

## Sequence clustering

- Dynamic Time Warping
- Soft-DTW
- HMM
- sequence embeddings
- temporal convolution
- Transformer encoders

---

# Sequence mining

Representar una secuencia como:

```text
state_1 → state_2 → state_3
```

Ejemplo:

```text
build-up-left
→ central-progression
→ right-overload
→ final-third-entry
```

Tecnologías:

- Hidden Markov Models
- Markov chains
- PrefixSpan
- SPADE
- custom sequence mining

---

# Tactical state machine

Puede definirse una máquina de estados:

```text
BUILD_UP
PROGRESSION
FINAL_THIRD
PRESSING
MID_BLOCK
LOW_BLOCK
COUNTERATTACK
DEFENSIVE_TRANSITION
ATTACKING_TRANSITION
SET_PIECE
```

Los estados pueden detectarse con:

- reglas;
- ML supervisado;
- clustering;
- modelos temporales.

---

# Possession estimation

Opciones:

1. jugador más cercano al balón;
2. control estable durante N frames;
3. velocidad del balón;
4. cambios de dirección;
5. eventos de toque;
6. modelo supervisado.

No cambiar posesión ante cada proximidad momentánea.

Usar hysteresis temporal.

---

# Ball-event detection

Detectar eventos:

```text
pass
carry
shot
cross
clearance
recovery
turnover
interception
```

Heurísticas:

- cambios de velocidad;
- dirección del balón;
- jugador más cercano;
- continuidad de posesión;
- distancia recorrida.

Modelos avanzados:

- temporal CNN;
- LSTM;
- transformer;
- video action recognition.

---

# Zone-based analysis

Dividir campo en:

- thirds;
- lanes;
- half-spaces;
- penalty areas;
- zones 14;
- configurable grids.

Ejemplo:

```text
5 vertical lanes
x
6 horizontal bands
```

Registrar:

- jugadores por zona;
- balón por zona;
- tiempo;
- entradas;
- salidas;
- densidad.

---

# Tactical width by lines

No limitarse a ancho total.

Calcular:

```text
defensive width
midfield width
attacking width
```

Esto permite detectar:

- extremos abiertos;
- laterales cerrados;
- bloque compacto;
- línea defensiva estrecha.

---

# Line synchronization

Medir desviación longitudinal de una línea:

```text
std(x_line)
```

Baja desviación:

```text
línea alineada
```

Alta desviación:

```text
línea rota
```

Aplicable especialmente a defensa.

---

# Defensive line height

Calcular:

```text
median(x_defensive_line)
```

Ajustado por dirección de ataque.

Usos:

- bloque alto;
- fuera de juego;
- profundidad;
- comportamiento tras pérdida.

---

# Defensive compactness

Variables:

```text
team_depth
team_width
hull_area
distance_between_lines
```

Crear índice configurable, por ejemplo:

```text
compactness_index =
normalized_hull_area
+
normalized_depth
+
normalized_line_distance
```

No imponer una fórmula universal sin validación.

---

# Stretch index

Puede utilizarse:

```text
mean distance of players to team centroid
```

Implementación:

```text
stretch_index = mean(||player - centroid||)
```

Útil para medir dispersión colectiva.

---

# Surface area

Convex hull:

```text
team_surface = hull.area
```

Analizar:

- con balón;
- sin balón;
- transición;
- último tercio;
- primera fase.

---

# Team length

```text
team_length = max(x) - min(x)
```

Comparar:

```text
home_length
away_length
```

---

# Team width

```text
team_width = max(y) - min(y)
```

---

# Inter-line verticality

Calcular desplazamiento lateral de centroides por línea.

Permite detectar:

- bloque inclinado;
- basculación;
- asimetría.

---

# Passing lanes

Construir segmentos:

```text
passer → teammate
```

Evaluar intersecciones con:

- defensores;
- zonas de presión;
- Voronoi;
- interception corridors.

Tecnologías:

- computational geometry;
- Shapely;
- segment-line distance.

---

# Graph representation

Representar equipo como grafo:

```text
nodes = players
edges = proximity / passing option / interaction
```

Tecnologías:

- NetworkX
- PyTorch Geometric

Métricas:

- degree;
- centrality;
- connectivity;
- clustering coefficient.

Aplicaciones:

- estructura de apoyo;
- redes de pase potenciales;
- compactación.

---

# Dynamic graphs

Crear graph snapshots por timestep.

Luego analizar:

- temporal GNN;
- graph embeddings;
- graph similarity;
- motif detection.

---

# Formation similarity

Comparar estructuras usando:

- Procrustes analysis;
- Earth Mover's Distance;
- Wasserstein distance;
- graph matching;
- optimal transport.

Útil para detectar:

```text
misma estructura desplazada
```

aunque cambie la posición absoluta.

---

# Pattern similarity

Normalizar:

- dirección de ataque;
- orientación;
- posición relativa al balón;
- centroide.

Esto permite comparar secuencias tácticas entre:

- diferentes partidos;
- diferentes equipos;
- diferentes fases.

---

# Temporal windows

No analizar táctica frame a frame.

Ventanas recomendadas:

```text
1 sec → micro interactions
3–5 sec → pressure / local pattern
10–20 sec → formation / team shape
30–60 sec → tactical phase
```

---

# Smoothing

Opciones:

- rolling median;
- moving average;
- Savitzky-Golay;
- Kalman filter;
- exponential smoothing.

Aplicar a:

- posiciones;
- centroides;
- widths;
- depths;
- hull area;
- line distances.

---

# Missing data

Cuando jugadores no son visibles:

1. mantener track si la oclusión es breve;
2. marcar confianza;
3. interpolar solo ventanas cortas;
4. no inventar posiciones en cortes largos;
5. degradar métricas tácticas según cobertura.

Registrar:

```text
visible_players_ratio
```

Ejemplo:

```text
8/10 visible = 0.8
```

No calcular métricas globales como si los 10 estuvieran presentes.

---

# Camera cuts

Detectar cortes con:

- histogram differences;
- PySceneDetect;
- optical flow discontinuity;
- shot boundary models.

Al cambiar plano:

- invalidar homografía;
- recalibrar;
- no asumir continuidad espacial directa;
- preservar track IDs solo si existe re-identificación fiable.

---

# Broadcast vs tactical camera

## Broadcast

Ventajas:

- disponible fácilmente.

Problemas:

- zoom;
- pan;
- cortes;
- pocos jugadores visibles;
- oclusiones.

## Tactical fixed camera

Ventajas:

- mayor cobertura;
- calibración estable;
- mejores métricas.

Si existe cámara táctica, priorizarla.

---

# Visualization

Tecnologías:

- mplsoccer
- matplotlib
- Plotly
- OpenCV
- Streamlit solo si el proyecto ya lo usa
- Dash
- React + D3
- Three.js para 3D

Visualizaciones útiles:

- tactical map;
- convex hull overlay;
- team centroid;
- line distances;
- formation labels;
- Voronoi;
- pressure map;
- player trails;
- team shape timeline.

---

# Recommended data formats

Tabular:

- Parquet;
- Arrow;
- DuckDB.

Frame-level:

```text
match_id
frame
timestamp
track_id
team
x
y
vx
vy
confidence
```

Derived metrics:

```text
match_id
timestamp
team
centroid_x
centroid_y
width
depth
hull_area
stretch_index
formation
block_height
```

---

# Storage architecture

Separar:

```text
raw_video
detections
tracks
calibration
world_coordinates
events
derived_metrics
visualizations
models
```

Evitar recalcular detecciones si ya fueron generadas.

---

# Processing architecture

## Offline pipeline

Recomendado inicialmente:

```text
video
→ inference
→ parquet
→ analytics
→ visualization
```

## Parallelism

Usar:

- multiprocessing;
- joblib;
- Ray;
- Dask;
- GPU batching.

No introducir Kafka o arquitecturas distribuidas sin necesidad real.

---

# GPU strategy

Usar GPU para:

- detection;
- pose;
- embeddings;
- deep learning.

CPU para:

- geometry;
- hulls;
- metrics;
- clustering;
- reporting.

---

# Evaluation

## Detection

- mAP
- precision
- recall

## Tracking

- HOTA
- IDF1
- MOTA
- ID switches

## Calibration

- reprojection error
- positional error in meters

## Tactical metrics

Validar contra anotación manual.

Ejemplos:

- error de altura de línea;
- error de distancia entre líneas;
- error de width/depth;
- IoU o diferencia de hull;
- formation accuracy;
- block classification F1.

---

# Ground truth strategy

Crear dataset pequeño manual:

```text
10–20 clips
```

Anotar:

- jugadores;
- IDs;
- coordenadas;
- equipo;
- líneas;
- formación;
- estados tácticos.

Eso permite evaluar el pipeline antes de escalar.

---

# Minimum viable proof of concept

Usar:

```text
1 partido
5–10 minutos
1 equipo analizado
```

Objetivos:

1. detectar jugadores;
2. trackear;
3. clasificar equipos;
4. proyectar al campo;
5. obtener mapa 2D;
6. medir width/depth;
7. calcular convex hull;
8. detectar líneas;
9. estimar formación;
10. detectar 2–3 patrones simples.

---

# Suggested implementation phases

## Phase 1 — Tracking foundation

- detection;
- tracking;
- team classification;
- ball detection.

## Phase 2 — Spatial mapping

- pitch detection;
- calibration;
- homography;
- metric coordinates.

## Phase 3 — Team shape

- centroid;
- width;
- depth;
- hull;
- stretch index;
- line detection.

## Phase 4 — Tactical structure

- formation;
- block height;
- pressure;
- compactness;
- overloads.

## Phase 5 — Pattern detection

- feature windows;
- clustering;
- state machine;
- sequence mining.

## Phase 6 — Advanced AI

- learned tactical states;
- transformers;
- GNN;
- self-supervised embeddings;
- multi-match similarity.

---

# Recommended Python packages

```text
opencv-python
numpy
pandas
polars
scipy
scikit-learn
shapely
networkx
pyarrow
duckdb
torch
torchvision
ultralytics
supervision
filterpy
hdbscan
umap-learn
ruptures
tslearn
mplsoccer
matplotlib
plotly
```

Opcionales:

```text
pytorch-geometric
transformers
ray
dask
cupy
numba
```

---

# Tactical pattern detection approaches

## Rule-based

Ideal para MVP.

Ejemplo:

```text
if centroid_x > threshold
and defensive_line_x > threshold
and opponent_in_own_half:
    state = HIGH_PRESS
```

## Statistical

- clustering;
- PCA;
- HDBSCAN;
- anomaly detection.

## Supervised ML

Etiquetar:

```text
high_press
mid_block
low_block
build_up
transition
```

Entrenar:

- Random Forest;
- XGBoost;
- LightGBM;
- temporal classifiers.

## Deep temporal models

- LSTM;
- TCN;
- Transformer;
- Temporal Fusion Transformer;
- Video Transformers.

No utilizar deep learning si reglas simples resuelven el problema con precisión suficiente.

---

# Change point detection

Detectar cambios de comportamiento durante partido.

Tecnologías:

- ruptures;
- Bayesian change point;
- CUSUM.

Aplicaciones:

- cambio de bloque;
- cambio de formación;
- cambio de altura defensiva;
- sustitución táctica.

---

# Anomaly detection

Detectar secuencias inusuales:

- Isolation Forest;
- Local Outlier Factor;
- Autoencoders.

Aplicación:

```text
ataque fuera de patrón habitual
```

---

# Feature store

Mantener features reutilizables:

```text
timestamp
team_centroid
width
depth
hull_area
stretch_index
line_distances
ball_position
pressure
possession
formation
```

Evitar recalcular para cada análisis.

---

# Metadata

Cada análisis debe registrar:

```text
model versions
config
video hash
pitch dimensions
fps
detection threshold
tracking config
calibration confidence
```

---

# Confidence propagation

Cada métrica derivada debe considerar calidad de entrada.

Ejemplo:

```text
metric_confidence =
detection_confidence
× tracking_confidence
× calibration_confidence
× visibility_ratio
```

No mostrar métricas tácticas como exactas cuando la cobertura visual sea pobre.

---

# Agent behavior

Cuando esta skill esté activa, el agente debe:

1. inspeccionar primero el pipeline existente;
2. identificar qué datos ya existen;
3. priorizar reutilización;
4. no mezclar coordenadas de imagen y campo;
5. medir precisión de calibración;
6. no inferir formaciones frame a frame;
7. usar ventanas temporales;
8. registrar incertidumbre;
9. separar métricas geométricas de interpretación táctica;
10. crear tests;
11. guardar outputs intermedios;
12. evitar recalcular inferencias pesadas;
13. documentar modelos y versiones;
14. producir resultados reproducibles.

---

# Output expected from implementation tasks

Ante una solicitud de desarrollo:

1. análisis del estado actual;
2. arquitectura propuesta;
3. módulos afectados;
4. plan incremental;
5. implementación;
6. tests;
7. métricas;
8. visualizaciones;
9. limitaciones;
10. próximos pasos.

Clasificar hallazgos con:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

Categorías:

```text
BUG
ARCHITECTURE
COMPUTER_VISION
TRACKING
CALIBRATION
TACTICAL_ANALYTICS
PATTERN_DETECTION
PERFORMANCE
DATA
RESEARCH_GAP
```

---

# Definition of done

Una funcionalidad táctica no está terminada solo porque produzca una imagen.

Debe:

- funcionar de forma reproducible;
- usar coordenadas correctas;
- tener tests;
- producir datos estructurados;
- incluir métricas de calidad;
- manejar missing data;
- registrar configuración;
- documentar supuestos;
- documentar limitaciones;
- poder compararse contra ground truth.

---

# Final principle

**Detection tells you where players are. Tracking tells you who they are. Calibration tells you where they are on the pitch. Tactical analytics tells you what the team is doing.**

La skill debe preservar esa separación conceptual en todo momento.
