# anti-patterns.md — Catálogo de anti-patrones

> IDs estables. Se citan en reglas, commits y auditorías: «esto es AP-02».
> **Cada entrada sale de código real de este repositorio**, no de una lista genérica de
> internet. Un catálogo genérico no lo consulta nadie.
>
> **ABIERTO** = sigue en el código hoy. **CERRADO** = ya se corrigió; la entrada se
> conserva como memoria de por qué existe la regla.
>
> Deuda ya aceptada y decidida: [`architectural-debt.md`](architectural-debt.md).
> Un hallazgo que corresponde a un `AD-*` vigente **no se re-reporta** como nuevo.

---

## Índice

| ID | Título | Severidad | Estado |
|---|---|---|---|
| [AP-01](#ap-01) | [título] | 🔴 crítica | ABIERTO |

Severidades: 🔴 crítica · 🟠 alta · 🟡 media · 🟢 baja

---

<a id="ap-01"></a>
## AP-01 — [título en una línea]

**Síntoma.** Qué se ve en el código. Concreto y localizable con una búsqueda.

**Por qué ocurre.** El mecanismo. Casi siempre es que **la ausencia de algo no salta a la
vista porque no hay nada que mirar** — una línea que no está no se lee.

**Consecuencia.** Qué pasa en producción, con qué entrada concreta.

**Instancias.**

| Archivo | Línea | Estado |
|---|---|---|
| `ruta/al/archivo.ts` | 42 | ABIERTO |

**Antes**

```ts
// el código real, tal cual
```

**Después**

```ts
// la corrección, tal cual
```

**Cómo se detecta.**

```bash
# el comando exacto que lo encuentra — este es el que acaba en el ratchet
```

> Un detector textual vacío **no prueba ausencia**: prueba que ese detector no encontró
> nada. Si el patrón puede escribirse de otra forma, decirlo aquí.
