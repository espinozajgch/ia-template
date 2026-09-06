---
name: preproduccion
description: Revisa un producto contra el checklist de las 13 puertas de preproducción y entrega el estado de cada requisito —PASS, PARTIAL, FAIL o N/A— con evidencia, más un plan de corrección priorizado. No modifica nada. Úsala antes de sacar algo a producción, o para saber qué le falta a un producto que ya está fuera.
---

# Preproducción

Recorre las trece puertas de
[`knowledge/wiki/checklist-preproduccion.md`](../../knowledge/wiki/checklist-preproduccion.md)
y dice **en qué estado está cada requisito en ESTE proyecto**.

**No modifica nada.** Es la misma separación que en [`auditar`](../auditar/SKILL.md) y por
el mismo motivo: una revisión que corrige a la vez deja de ser una revisión, y al terminar
nadie sabe qué estaba mal antes de empezar.

---

## 1 · Antes de mirar nada, acotar

Al invocar quedan fijados:

```
ALCANCE  = producto entero | una puerta (G1…G13) | un bloque (seguridad, SEO…)
PROFUNDIDAD = rápida (lo que se lee del repositorio)
            | completa (además: levantar el producto y comprobarlo)
```

**Y el tipo de producto**, que es lo que decide qué `N/A` son legítimos:

- ¿Se descubre por buscador? Si no, casi todo G10 es `N/A`.
- ¿Tiene cuentas? Si no, G5 entero es `N/A`.
- ¿Es multiempresa? Si no, la parte de aislamiento de G6 es `N/A`.
- ¿Trata datos personales? Si no, G9 se acorta mucho.

Esto se **pregunta o se deduce del código y se declara**, no se supone. Un `N/A` puesto por
comodidad es la forma más silenciosa de que algo no se revise nunca.

---

## 2 · Leer lo ya sabido

Igual que en `auditar`, y por lo mismo: para no volver a reportar lo que ya se decidió.

```bash
cat knowledge/wiki/architectural-debt.md   # AD-* : deuda ACEPTADA
cat knowledge/wiki/anti-patterns.md        # AP-* : ya catalogado
cat knowledge/wiki/decisions.md            # por qué se hizo así
ls knowledge/informe-*                     # revisiones anteriores
```

Un requisito cubierto por un `AD-*` vigente no es un `FAIL`: es un `PARTIAL` que **cita el
AD** y comprueba su *trigger*. Si el trigger se cumplió, entonces sí, y se dice que lo
reabre.

---

## 3 · Cada requisito, con evidencia

```markdown
| G6.2 | RLS cuando aplique | ❌ FAIL | `apps/api/src/prisma.ts` — el aislamiento
depende de que cada consulta recuerde `companyId`; 74 de 134 no lo nombran |
```

Las reglas que hacen que esto valga algo:

- **Sin evidencia no hay `PASS`.** Fichero y línea, o la salida del comando. Un `grep`
  vacío no prueba ausencia: prueba que ese `grep` no encontró nada.
- **Comprobar el mecanismo, no la presencia.** Que exista un fichero `csp.ts` no es un
  `PASS` de CSP: el `PASS` es la cabecera en la respuesta real. Que haya un `rate-limit`
  importado no es un `PASS`: el `PASS` es la petición 101 devolviendo 429.
- **Lo que no se pudo comprobar se dice.** Sin credenciales, sin entorno, sin datos: es su
  propia línea en el informe, no un `PASS` optimista ni un `FAIL` injusto.
- **Un `PARTIAL` dice qué falta.** «Mejorable» no es un estado.
- **Un `N/A` dice por qué.** Sin motivo, es un `FAIL` disfrazado.

### La trampa que más veces engaña

Comprobar una defensa **con quien puede saltársela**. Ocurrió el 2026-08-27 en `hipismo`:
las políticas de aislamiento estaban puestas, la suite en verde, y no protegían nada porque
la conexión era de un superusuario de PostgreSQL, que se las salta enteras sin avisar.

Vale para todo este checklist: se comprueba **con el actor que va a sufrir la defensa**, no
con el que la administra. Un rol sin privilegios, una sesión de otro rol, un navegador sin
la extensión, una red lenta de verdad.

---

## 4 · La salida

Tres piezas, en este orden:

**Un resumen que se lee de un vistazo.**

```
G1 Funcionalidad   ✅ 11  ⚠️ 2  ❌ 1  ➖ 0
G2 UX              ✅ 18  ⚠️ 9  ❌ 7  ➖ 0
…
TOTAL              ✅ 96  ⚠️ 31 ❌ 22 ➖ 10
```

**La tabla completa**, puerta por puerta, con la evidencia de cada línea.

**El plan**, ordenado por daño × esfuerzo y **no** por número de puerta:

1. Los `FAIL` de G5, G6, G7 y G8 —autenticación, datos, backend y seguridad— van primero,
   siempre. Un fallo de aislamiento o de autorización no espera al SEO.
2. Lo barato que cierra un `FAIL`.
3. Lo que **sostiene** lo arreglado: un guardián en la puerta de calidad vale más que el
   arreglo concreto, porque impide que vuelva.
4. El resto, por puerta.

Y en el chat: cuántos por estado, los tres peores con su consecuencia concreta, qué **no**
se pudo revisar, y el primer *quick win*.

El informe va donde van los del proyecto —normalmente
`knowledge/informe-preproduccion-<fecha>.html`, ver [`informe`](../informe/SKILL.md)—.

---

## 5 · Lo que esta skill NO hace

- **No corrige.** Para eso: `MODO=PLAN` y luego [`avanzar`](../avanzar/SKILL.md), de una en
  una y con su verificación.
- **No inventa requisitos.** Si algo importante de este producto no está en las trece
  puertas, se añade al catálogo con su motivo — y entonces vale para todos los proyectos,
  que es de lo que se trata.
- **No convierte un `FAIL` en deuda por su cuenta.** Aceptar un riesgo es una decisión del
  dueño del producto; lo que hace la skill es dejarla escrita en `architectural-debt.md`
  con su coste y su *trigger* de reapertura, cuando alguien la toma.
