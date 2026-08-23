# Pack · monorepo

**Se activa si:** el repositorio contiene más de un proyecto con su propio manifiesto —
`client/` y `server/`, `apps/*` y `packages/*`, o varios servicios juntos.

Cuatro de los trece proyectos de la cantera lo son, y hasta ahora ningún pack lo cubría:
el instalador asumía un solo proyecto en la raíz.

---

## Reglas

### Un comando en la raíz recorre todo

Si verificar exige entrar en tres carpetas y acordarse de tres comandos, alguien va a
correr dos. Un `quality:check` en la raíz que delega en cada paquete, y **la puerta es
ese comando**.

```jsonc
// package.json de la raíz
"scripts": {
  "typecheck":     "npm run typecheck --workspaces --if-present",
  "quality:check": "npm run quality:check --workspaces --if-present"
}
```

En CI, la matriz por subproyecto (`agente/ci/github/calidad.yml`) da lo que un solo job no
da: **cuál falló**, y que un paquete en rojo no oculte el estado del otro.

### La dependencia entre paquetes va en una sola dirección

El grafo tiene que ser acíclico y estar escrito. Lo habitual y lo que aguanta:

```
apps/*  →  packages/*  →  packages/compartido
```

Una aplicación **nunca** importa de otra aplicación. Cuando dos aplicaciones necesitan lo
mismo, ese algo baja a un paquete: es la única forma de que no acaben acopladas por la
puerta de atrás.

```bash
node agente/tools/ciclos.mjs apps packages   # el verificador ya cubre esto
```

### Lo compartido se comparte por contrato, no por conveniencia

Un paquete compartido que crece con «lo que hacía falta en los dos sitios» acaba siendo un
cajón del que todo el mundo depende y nadie mantiene. Cada paquete compartido declara
**qué resuelve** y qué no; lo que no encaja se queda en la aplicación que lo necesita,
aunque se duplique. **Dos copias que evolucionan distinto son más baratas que una
abstracción equivocada.**

Lo que sí merece un paquete compartido casi siempre: los **tipos del contrato** entre
frontend y backend. Es lo que evita que el cliente y el servidor discrepen en silencio
sobre la forma de una respuesta.

### Los tipos del contrato se generan, no se escriben dos veces

Un tipo copiado a mano en los dos lados es un tipo que se va a desincronizar. Se genera del
esquema —de la base, del OpenAPI, del validador— y **la generación entra en la puerta**,
así que un cambio no propagado la rompe.

### Cada paquete declara lo que usa

Nada de apoyarse en que la dependencia está izada en la raíz del árbol de módulos: el día
que otro paquete la quita, el que la usaba deja de compilar sin haber cambiado. Cada
`package.json` lista lo suyo.

### Sin ficheros que crucen la frontera

Nada de importar por ruta relativa hacia fuera del paquete (`../../otra-app/src/…`). Si
hace falta, es que debía ser un paquete compartido. Un ratchet lo detecta:

```bash
agente/tools/ratchet.sh baseline fuga-entre-paquetes \
  "grep -rnE \"from '(\\.\\./){3,}\" apps packages --include=*.ts --include=*.tsx"
```

### La versión del runtime es una sola

Node, Python o el que sea: una versión declarada en la raíz y usada por todos. Dos
paquetes con dos versiones distintas producen fallos que solo aparecen en el que se
despliega segundo.

---

## Qué instalar en cada sitio

| Fichero | Dónde |
|---|---|
| `AGENTS.md` | **solo en la raíz** — uno por repositorio, no uno por paquete |
| `knowledge/wiki/` | solo en la raíz: la fuente de verdad es del repositorio |
| `agente/` | solo en la raíz; los paquetes lo invocan con rutas relativas |
| `.claude/` · `.cursor/` | solo en la raíz |
| ratchets y líneas base | **uno por paquete** — cada uno tiene su deuda |

Instalación:

```bash
~/ia-template/instalar.sh . monorepo frontend-web api-backend
```

Y las líneas base, por paquete:

```bash
for p in apps/*/ packages/*/; do (cd "$p" && node ../../agente/tools/tamano.mjs baseline src); done
```

---

## Checklist

- [ ] Un solo comando en la raíz corre la puerta de todos los paquetes
- [ ] CI con matriz por subproyecto y `fail-fast: false`
- [ ] Grafo de dependencias acíclico y en una dirección — verificado con `ciclos.mjs`
- [ ] Ninguna aplicación importa de otra aplicación
- [ ] Los tipos del contrato se generan, y la generación está en la puerta
- [ ] Cada paquete declara sus propias dependencias
- [ ] Sin imports relativos que crucen la frontera de un paquete
- [ ] Una sola versión del runtime, declarada en la raíz
