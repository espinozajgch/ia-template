# Inventario de datos personales

> Sin este documento no se puede responder a quien pida sus datos, ni borrarlos, ni saber
> qué se filtró si algo se filtra. En la mayoría de jurisdicciones **es obligación legal**,
> con plazos.
>
> Lo comprueba `clasificacion.mjs`: si aparece una columna que parece dato personal y no
> está aquí, la puerta falla.

---

## 1 · Alcance y papel

**Qué trata este sistema:** [una frase]
**Papel:** responsable del tratamiento · encargado · ambos según el dato
**Base legal principal:** contrato · consentimiento · interés legítimo · obligación legal
**Dónde se alojan los datos:** [proveedor y región]

---

## 2 · Niveles

| Nivel | Qué es | Ejemplos |
|---|---|---|
| **S4 · crítico** | categoría especial: salud, biometría, ideología, orientación | diagnóstico, alergias, huella |
| **S3 · alto** | identifica directamente o permite suplantar | documento, dirección, teléfono, salario |
| **S2 · medio** | identifica combinado con otros | nombre, fecha de alta, rol |
| **S1 · bajo** | no identifica | código de producto, estado |

---

## 3 · Inventario por tabla

### `[tabla]`

| Columna | Nivel | Base legal | Retención | Notas |
|---|---|---|---|---|
| `tabla.columna` | S3 | contrato | 5 años tras la baja | |

### Tablas sin datos personales

Se listan **explícitamente**: una tabla que no está ni aquí ni arriba es una tabla que
nadie ha mirado.

`tabla_a` · `tabla_b`

---

## 4 · Derechos del titular, y dónde están implementados

| Derecho | Cómo se atiende | Dónde |
|---|---|---|
| Acceso | | |
| Rectificación | | |
| **Supresión** | | |
| **Portabilidad** | exportación en formato legible por máquina | |
| Oposición | | |

> Un derecho sin implementación no es un derecho: es una promesa que se atiende a mano y
> tarde. Si algo se hace a mano, **decirlo aquí** con su plazo real.

---

## 5 · Trampas verificadas

Las que aparecen una y otra vez. Marcar las que aplican a este proyecto:

- [ ] **El borrado lógico conserva el dato.** Una fila «borrada» retiene todo. La supresión
      real necesita anonimizar, y hay que comprobar **qué tablas no toca** el anonimizador.
- [ ] **Los derivados heredan la clasificación.** Un vector calculado sobre texto sensible
      es sensible. No son «solo números».
- [ ] **El texto libre es un sumidero.** En `notas` y `observaciones` acaba cualquier cosa:
      un diagnóstico, un teléfono, la vida de alguien. Ningún clasificador por nombre lo ve.
- [ ] **Un clasificador por tipo se pierde lo importante.** Dinero guardado como texto
      porque el criterio es lenguaje natural; un campo `referencia` que guarda un documento.
- [ ] **Las copias de seguridad tienen su propia retención.** Borrar de la base no borra de
      las copias, y ese plazo hay que declararlo.
- [ ] **Menores:** si los hay, el tratamiento es reforzado y la base legal es otra.

---

## 6 · Reglas de salida por canal

Clasificar no sirve de nada por sí solo. Lo que importa es **qué puede salir por cada
salida**, y que sea verificable.

| Canal | S4 · S3 | S2 · S1 | Cómo se garantiza |
|---|---|---|---|
| **Registros** | prohibido | permitido | redacción central en el registrador — pack `observabilidad` |
| **Modelos de lenguaje externos** | prohibido | según contrato | [qué se envía, y qué se quita antes] |
| **Informes y exportaciones** | según permiso | permitido | [dónde se comprueba] |
| **Analítica de terceros** | prohibido | pseudonimizado | |
| **Copias de seguridad** | permitido | permitido | cifradas · retención [X] |

### Reglas para quien escribe registros

1. **El dato va en el contexto, nunca interpolado en el mensaje.** La redacción opera sobre
   **claves**, no sobre el texto.
2. **Nunca volcar una entidad entera ni un cuerpo de petición.** La lista de redacción es
   una red, no una licencia.
3. Al añadir un término a la lista, **comprobar la sobre-redacción** contra las claves
   reales: un término corto puede vaciar campos legítimos.

---

## 7 · Registro de cambios

| Fecha | Qué cambió | Quién |
|---|---|---|
