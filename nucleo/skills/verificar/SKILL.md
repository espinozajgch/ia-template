---
name: verificar
description: La puerta de calidad. Descubre cómo se verifica este proyecto —lo que ejecuta su integración continua— y lo ejecuta entero antes de dar nada por hecho. Úsala siempre antes de commitear cualquier cambio que toque código.
---

# Verificar

La puerta. **Nada está hecho hasta que pasa.** No se sustituye por «he leído el diff» ni
por «los tests que toqué pasan».

Esta skill no trae una lista de comandos escrita: cada proyecto tiene la suya y una lista
copiada de otro sitio caduca el día que alguien añade un paso. Trae **cómo encontrarla**.

**Antes de nada:** si existe `knowledge/wiki/skills/verificar.md`, léelo. Es la puerta
concreta de este proyecto —sus partidos de referencia, sus perfiles, sus trampas— y, donde
sea más estricta que esta skill, manda ella.

---

## 1 · Averiguar cuál es la puerta

La respuesta autorizada es **lo que ejecuta la integración continua**. Si CI está en verde
y en local no se ha corrido lo mismo, no se ha verificado nada: se ha adivinado.

Por orden de fiabilidad:

```bash
# 1. La definición de CI — la fuente de verdad
ls .github/workflows/ .gitlab-ci.yml .circleci/ Jenkinsfile 2>/dev/null
# y leerla entera: cada `run:` es un paso de la puerta

# 2. Los scripts declarados
cat package.json | grep -A40 '"scripts"'
cat Makefile justfile Taskfile.yml pyproject.toml 2>/dev/null

# 3. Lo que diga el proyecto de sí mismo
cat CONTRIBUTING.md CLAUDE.md AGENTS.md README.md 2>/dev/null | grep -iA5 "test\|verif\|lint"
```

Lo que aparezca en CI y **no** se pueda correr en local —un servicio gestionado, una
credencial que no se tiene— se dice explícitamente en la salida. No se omite en silencio.

### El entorno, primero

La puerta se corre **en el repositorio**, con la versión del lenguaje que declara el
proyecto y las dependencias **desde el fichero bloqueado**. Una suite en verde sobre una
pila que nadie declaró —un venv de otro directorio, un intérprete más nuevo— no prueba nada.
Si el proyecto trae un comprobador de entorno, se pasa antes de fiarse del resultado.

### Si el cambio sólo toca documentación o skills

La puerta de código no aporta nada. Se comprueban los enlaces y rutas que se nombran, el
frontmatter y la estructura de cada skill, y los validadores del formato si existen. Y se
dice así en la salida, no «puerta en verde».

---

## 2 · Ejecutarla entera

Todos los pasos, no los que parezcan relacionados con el cambio. Un `typecheck` en rojo en
otro módulo es igual de rojo.

El orden que suele convenir, cuando hay elección:

1. **lo que compila o comprueba tipos** — falla en segundos y ahorra el resto;
2. **lo que prueba unidades** — rápido y localiza el fallo;
3. **lo que prueba de extremo a extremo** — lento, y su fallo suele venir de lo anterior;
4. **lo que audita** — dependencias y secretos;
5. **lo estructural** — ciclos de importación, tamaño de fichero, deriva de esquema. Estos
   no los trae ningún proyecto de serie; el kit sí:

   ```bash
   node agente/tools/ciclos.mjs    src        # ciclos de importación
   node agente/tools/tamano.mjs    validate   # ficheros que crecen
   node agente/tools/secretos.mjs             # credenciales en lo trackeado y en el remoto
   node agente/tools/esquema.mjs   orden      # migraciones coherentes (si hay base de datos)
   node agente/tools/esquema.mjs   sellos     # ninguna migración aplicada fue editada
   node agente/tools/cobertura.mjs validar    # la cobertura no baja
   ```

   Detectan degradación de la **forma**, no del comportamiento: por eso pasan todos los
   tests y aun así el proyecto empeora.

Lo lento va en segundo plano y se sigue con documentación mientras corre. **Esperar no es
motivo para informar.**

Si algo falla: arreglar y **repetir la puerta entera**, no solo el paso que falló. Arreglar
una cosa rompe otra con más frecuencia de la que uno recuerda.

Un test que falla **no se salta ni se marca `skip`**: o el cambio está mal, o el test estaba
mal y se dice por qué. Si falla algo ajeno al cambio, se demuestra: se corre ese mismo paso
**sin el cambio** (en otro worktree, o con `git stash`) y se enseña que falla igual.

Si cambiaron dependencias, se pasa además su auditoría (`npm audit`, `pip-audit`…).

Si el proyecto lleva un **registro de contratos de regresión**, se ejecuta la fila del área
que se tocó: la suite completa no sustituye lo que ese registro pide mirar a mano.

---

## 3 · Recorrer lo que se ha tocado

Un test verde con la pantalla rota es un test que prueba otra cosa.

Después de la puerta automática, ejercitar **el flujo real** que cambió: levantar el
servicio, entrar por donde entra quien lo usa, hacer lo que hace. Si el cambio es de
interfaz, mirarla; si es de datos, leer una fila; si es de despliegue, desplegar.

Este paso es el que atrapa lo que ninguna suite ve — una hoja de estilos que se descarga y
no se aplica, un marco que la política de seguridad bloquea, un contenedor que arranca y
muere al primer contacto con la base.

Si es interfaz: carga, éxito, vacío, error, permisos, teclado y al menos un ancho de móvil.

### Comparar contra HEAD, no contra una foto vieja

Cuando la prueba es «la conducta no ha cambiado» y las referencias guardadas están
desfasadas, compararlas da un falso rojo enorme. La comparación buena es contra **HEAD**:
se ejecuta con el cambio, se aparta (`git stash` u otro worktree), se ejecuta sin él y se
comparan las dos ejecuciones.

Y antes de culpar al cambio de una diferencia, se ejecuta **dos veces la misma versión**. Si
también difieren, lo que hay es no determinismo, no una regresión.

### Lo que no se toca al verificar

Ninguna prueba escribe en la base, el almacenamiento, la mensajería o la nube de
producción. Ningún secreto, token ni hash aparece en una respuesta, un log o una captura.
Lo que se muestra simulado sigue rotulado como simulado.

---

## 4 · Decir el hueco

La pregunta que cierra: **¿lo que he cambiado lo recorre algo de lo que acabo de correr?**

Si la respuesta es no, se dice, y se cubre de otra forma:

- un test nuevo, si el comportamiento se puede aislar;
- un verificador o una sonda, si depende del entorno;
- el recorrido manual **descrito paso a paso**, si no queda otra.

Callar el hueco es peor que tenerlo. Quien lea «verificado» va a creer que estaba cubierto.

---

## Salida

Números, no adjetivos. Lo que se ejecutó, con su resultado, y lo que no.

```
typecheck OK · 461 unitarias · 156 e2e · 0 vulnerabilidades · sin ciclos · esquema al día
Recorrido a mano: alta de usuario y primer acceso, en Chrome, 390 px
Sin cobertura automática: el arranque del contenedor — comprobado desplegando
```

«Todo bien» no es una salida. Si un paso no se pudo correr, aparece con el motivo.
