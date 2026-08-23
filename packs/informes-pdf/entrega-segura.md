# Entregar un PDF que es de alguien

> De una implementación real: informes clínicos que llegan cifrados con una única clave y
> hay que entregar a cada persona el suyo, sin darle la clave.

---

## El problema

Los documentos llegan de un tercero **cifrados con una sola clave**, la misma para todos.
El personal los sube tal cual, así que en el almacenamiento reposan cifrados — bien.

Pero la persona tiene derecho a su documento y **no tiene por qué conocer esa clave**:
dársela es darle la de todos los demás.

## La solución, y lo que la hace correcta

El servidor **descifra al vuelo**, solo en el canal de esa persona, y **nunca guarda una
copia en claro**. El original sigue cifrado donde está; lo descifrado vive los segundos que
dura la respuesta.

```
almacenamiento          servidor                    persona
  cifrado      →   descifra en memoria      →   su documento
     ↑                    ↓
  intacto          nada se escribe
```

Tres reglas que van juntas:

1. **La clave sale del entorno**, nunca del código ni de la base.
2. **No se escribe en disco**, ni siquiera temporalmente. Un fichero temporal sobrevive a
   la petición, aparece en las copias de seguridad y no lo borra nadie.
3. **Se autoriza antes de descifrar**, no después. Comprobar la propiedad del documento va
   primero: descifrar y luego decidir deja el contenido en memoria de una petición que no
   tenía derecho a él.

---

## La decisión que lo distingue: degrada, no revienta

Sin clave configurada, con un documento que no está cifrado, con la clave equivocada o sin
la librería disponible, **se devuelve el fichero original intacto** en lugar de fallar.

En el peor caso la persona recibe un PDF que le pide clave. Nunca recibe un error.

Es una elección sobre **quién paga el fallo**, y merece estar escrita en el propio fichero:
un documento que no se abre es un problema del que lo configuró; un error en pantalla es un
problema de quien solo quería su análisis.

> La alternativa —fallar ruidosamente— es lo correcto en casi todo lo demás, y el kit lo
> defiende en varios sitios. Aquí no, y el motivo es concreto: el fallo no impide entregar,
> solo impide entregarlo cómodo. Cuando fallar **no** protege de nada, degradar es mejor.

---

## Lo que hay que decidir en cada proyecto

| Decisión | Notas |
|---|---|
| Dónde vive la clave | gestor de secretos, o variable de entorno; nunca la base de datos |
| Si se registra el acceso | un documento personal descargado suele querer traza: quién, qué y cuándo |
| Qué pasa si la librería no está | degradar como aquí, o fallar; lo importante es **decidirlo** |
| Caducidad del enlace | si se entrega por enlace temporal, cuánto dura |

---

## Checklist

- [ ] El documento reposa cifrado; se descifra solo para entregarlo
- [ ] Nunca se escribe una copia en claro, ni temporal
- [ ] La autorización se comprueba **antes** de descifrar
- [ ] La clave sale del entorno
- [ ] El comportamiento sin clave o con clave mala está **decidido y escrito**
- [ ] El acceso queda registrado si el documento es personal
