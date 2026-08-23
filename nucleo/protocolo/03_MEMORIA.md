# Memoria del proyecto

> El ciclo sin este paso es una metodología. Con él, es un sistema que aprende.
> **Cada sesión debe dejar el proyecto más inteligente que la anterior.**

---

## El bucle

```
El usuario corrige al agente
        │
        ▼
Se escribe la regla en knowledge/wiki/lessons.md
        │
        ▼
Si tiene detector fiable → pasa a anti-patterns.md con ID AP-*
        │
        ▼
Si el detector se puede automatizar → se convierte en ratchet
        │
        ▼
La regresión se vuelve imposible, y la regla deja de necesitar memoria
```

El destino de una lección **no es quedarse en un documento**: es convertirse en un
mecanismo que la haga innecesaria.

---

## Qué va dónde

| Lo que ocurre | Dónde se escribe |
|---|---|
| El usuario corrige un patrón | `lessons.md` → `L-nn` |
| El patrón se repite y tiene detector | `anti-patterns.md` → `AP-nn` |
| Se decide **no** arreglar algo, conscientemente | `architectural-debt.md` → `AD-nn` con trigger |
| Se elige entre alternativas de arquitectura | `decisions.md` → `ADR-nnn` |
| Aparece una decisión que no es del agente | `decisiones-pendientes.md` → `D-n` |
| Se descubre una trampa del repositorio | `AGENTS.md` §7 |
| Cambia lo que el producto hace | `features.md`, en el mismo commit |
| Cambia la marca o el sistema visual | `product-design.md` |
| Un término del dominio se usa con dos sentidos | `glossary.md` |
| Cambia un proveedor o una API | la sección de integraciones de `AGENTS.md` |

---

## Reglas de la memoria

- **Una lección es una regla accionable**, no una anécdota. Si no se puede aplicar la
  próxima vez, no es una lección.
- **Los IDs no se reciclan.** Un `AP-07` cerrado se queda cerrado; el siguiente es `AP-08`.
  Los IDs viven en commits e informes antiguos.
- **Lo cerrado no se borra.** La entrada es la memoria de por qué existe la regla. Borrarla
  garantiza que alguien reintroduzca el patrón.
- **Fechas absolutas.** «La semana pasada» no significa nada dentro de seis meses.
- **Sin fuente, no entra.** Toda entrada lleva `archivo:línea` o la fecha de la conversación.
- **Se escribe en el mismo commit** que el cambio. La documentación que se deja para
  después no se escribe.

---

## El camino de vuelta al kit

La versión anterior del kit se quedó atrás mientras los proyectos avanzaban: había camino
de ida —copiar el kit— y no había camino de vuelta. Las mejoras se quedaban donde nacían y
el mismo fichero acabó con seis versiones distintas en seis repositorios.

```bash
node agente/tools/cosechar.mjs          # las dos direcciones
node agente/tools/cosechar.mjs subir    # qué de aquí le falta al kit
node agente/tools/cosechar.mjs bajar    # qué del kit falta aquí
```

Propone, no sube nada solo. Compara skills, protocolo, herramientas, packs, prompts y
plantillas de CI, y además detecta los **verificadores propios** que este proyecto
inventó y el kit no tiene — que es lo más valioso a cosechar.

**La regla que decide:** una pieza entra en el **núcleo** cuando ha sido útil en **dos
proyectos distintos**. Con uno, va a un pack. Si es de un dominio concreto, a
`prompts/_dominio/` y no se instala por defecto. Sin esa regla, el núcleo vuelve a engordar
hasta que nadie lo lee.

---

## Higiene, una vez por trimestre

- ¿Qué `AP-*` ABIERTO lleva meses sin instancias? Se cierra.
- ¿Qué `AD-*` tiene el trigger cumplido? Se reabre como hallazgo.
- ¿Qué `D-n` sigue ABIERTA sin bloquear nada? Se cierra como caducada.
- ¿Qué lección ya tiene ratchet? Se marca como automatizada.
- ¿`AGENTS.md` pasa de 250 líneas? Se saca material a `knowledge/wiki/`.
- `cosechar.mjs`: ¿hay algo aquí que ya ha servido en otro proyecto? Sube al kit.
