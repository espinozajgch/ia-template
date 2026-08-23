# Pack · bot-automatizacion

**Se activa si:** hay un bot, un worker programado, un pipeline que publica solo, o
cualquier proceso que actúa sin que una persona mire.

---

## Reglas

### Modo de validación, siempre

Un interruptor que hace **todo** el trabajo real y, en vez de publicar, escribe lo que
habría publicado. Es la única forma segura de probar un cambio en un sistema que actúa.
Si no existe, construirlo es la primera tarea.

```
MODO=validacion   → calcula, registra la salida, NO publica
MODO=produccion   → publica
```

**Producción no es el valor por defecto.** El valor por defecto es validación.

### Cambiar lo que el bot produce es decisión del usuario

Unificar dos textos que difieren, corregir un dato de salida, activar algo que nunca
funcionó: **todo eso cambia lo que ven los destinatarios** y no es del agente, aunque
parezca obviamente correcto. Se aparca en `decisiones-pendientes.md`.

Corolario: un refactor está bien hecho cuando la salida es **idéntica**, byte a byte,
contra los casos de referencia.

### Casos de referencia, guardados

Dos o tres ejecuciones reales completas, con su entrada y su salida esperada, en el
repositorio. Son la prueba de caracterización: el refactor que las cambia está mal, aunque
todo lo demás pase.

### Idempotencia y ejecuciones solapadas

¿Qué pasa si se ejecuta dos veces sobre la misma entrada? ¿Y si la ejecución de las 10:00
sigue viva cuando arranca la de las 10:05? Un cerrojo, o un diseño que lo tolere. Las
ejecuciones solapadas son la causa habitual de los mensajes duplicados.

### Fallar ruidosamente, y en un sitio donde alguien mire

Un proceso automático que falla en silencio deja de funcionar durante semanas sin que nadie
lo note. Alerta al fallar **y** señal de vida cuando todo va bien: solo así se distingue
«no ha pasado nada» de «lleva un mes muerto».

### Límites de gasto y de ritmo

Un bucle con reintentos contra una API de pago puede gastar mucho dinero muy rápido. Tope
absoluto de llamadas por ejecución, y parada de emergencia.

---

## Checklist

- [ ] Modo validación existe, es el valor por defecto y se probó con él
- [ ] Casos de referencia guardados; la salida es idéntica salvo que cambiarla fuera el objetivo
- [ ] Idempotente, y protegido contra ejecuciones solapadas
- [ ] Alerta al fallar y señal de vida al funcionar
- [ ] Topes de llamadas y de gasto por ejecución
- [ ] Nada que cambie lo publicado sin decisión explícita del usuario
