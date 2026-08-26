<!-- ejemplo-rellenado -->
> ## ⚠️ ESTO ES UN EJEMPLO YA RELLENADO, DE OTRO PROYECTO
>
> Lo que hay debajo son las respuestas de **un recomendador con Smart Searcher** — una API de scouting en TypeScript—, no las de este
> proyecto. Se instala así a propósito: **una hoja bien rellenada enseña qué nivel de
> detalle hace falta**, y una plantilla vacía no enseña nada.
>
> **Reemplázalo antes de que ningún agente lo lea como si fuera cierto aquí.** Una hoja
> de otro proyecto no es contexto neutro: es contexto FALSO con formato de verdad, y se
> obedece igual que el bueno. Los modelos, las rutas de fichero y los GAP de abajo son
> de aquel sistema.
>
> Las rutas relativas apuntan a la raíz del proyecto (`../../`) porque esta hoja se
> instala en `agente/sistema/`.

---

# Requirements — Requisitos Tecnicos y Tecnologicos

> Actualizado: 2026-05-13

---

## 1. Requisitos Funcionales

### Autenticacion y Acceso

| ID | Requisito | Estado |
|---|---|---|
| RF-01 | Login con username + password | CUMPLE |
| RF-02 | JWT con expiracion configurable, default 7 dias | CUMPLE |
| RF-03 | Roles `admin`, `agente`, `scout`, `observador` | CUMPLE |
| RF-04 | Gestion de usuarios solo admin | CUMPLE |
| RF-05 | Cambio de contrasena propia | CUMPLE |
| RF-06 | Filtro de genero por usuario: `ambos`, `M`, `F` | CUMPLE |
| RF-07 | Rechazo de token invalido/expirado | CUMPLE |
| RF-08 | Proteccion contra fuerza bruta | PENDIENTE |

### Modulos Operativos

| Modulo | Requisito | Estado |
|---|---|---|
| Dashboard | KPIs, alertas, eventos y resumen operativo | CUMPLE |
| Futbolistas | CRUD representados e intermediaciones | CUMPLE |
| Contratos | Contratos de club y representacion | CUMPLE |
| Finanzas | Ingresos, gastos, cuotas y multi-moneda | CUMPLE |
| Mercado | Busquedas, ofrecimientos, negociaciones y colaboradores | CUMPLE |
| Scouting | Scouts, jugadores, informes y clubes | CUMPLE |
| Calendario | Eventos, etiquetas, participantes y comentarios | CUMPLE |
| Contactos | Directorio filtrable | CUMPLE |
| Ajustes | Agencia, usuarios, perfiles, idioma y preferencias | CUMPLE |

### Persistencia y Archivos

| ID | Requisito | Estado |
|---|---|---|
| RF-20 | PostgreSQL como fuente de verdad | CUMPLE |
| RF-21 | Migraciones gestionadas con Drizzle | CUMPLE |
| RF-22 | Upload de imagenes a filesystem local | CUMPLE |
| RF-23 | PDFs generados/guardados en filesystem local | CUMPLE |
| RF-24 | Backups automaticos de PostgreSQL | PENDIENTE |

---

## 2. Requisitos No Funcionales

| ID | Requisito | Estado |
|---|---|---|
| RNF-01 | API protegida con JWT | CUMPLE |
| RNF-02 | Passwords con bcrypt | CUMPLE |
| RNF-03 | Builds reproducibles con npm | CUMPLE |
| RNF-04 | Frontend servido estatico por Nginx | CUMPLE |
| RNF-05 | API gestionada por systemd | CUMPLE |
| RNF-06 | Secrets fuera de Git | CUMPLE |
| RNF-07 | HTTPS en produccion | PENDIENTE |
| RNF-08 | Rate limit login/API | PENDIENTE |
| RNF-09 | Validacion runtime de payloads | PENDIENTE |

---

## 3. Requisitos Tecnologicos

### Runtime

| Componente | Actual |
|---|---|
| Node.js | 22 recomendado |
| Backend | Express 5 + TypeScript |
| Frontend | React 19 + Vite + TypeScript |
| CSS | Tailwind CSS |
| DB | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | jsonwebtoken + bcryptjs |

### Desarrollo

| Comando | Uso |
|---|---|
| `cd client && npm run dev` | Frontend local |
| `cd server && npm run dev` | API local |
| `cd client && npm run build` | Build frontend |
| `cd server && npm run build` | Build backend |
| `cd server && npm run db:migrate` | Migraciones |

### Produccion

| Componente | Uso |
|---|---|
| Nginx | Sirve `client/dist` y proxya API/uploads |
| systemd | Servicio `pptransferhub-api` |
| GitHub Actions | Deploy por SSH |
| PostgreSQL local | Base `pptransferhub`, schema `app` |

---

## 4. Deuda Tecnica Priorizada

| ID | Gap | Prioridad |
|---|---|---|
| DT-01 | Validacion runtime de payloads | Alta |
| DT-02 | Politicas de autorizacion por modulo/rol mas explicitas | Alta |
| DT-03 | Backups automaticos con `pg_dump` y retencion | Alta |
| DT-04 | HTTPS con dominio y Certbot | Alta |
| DT-05 | Rate limiting en login | Media |
| DT-06 | Cierre/restriccion de puertos temporales | Media |
| DT-07 | Estrategia futura para uploads si crece el volumen | Baja |
